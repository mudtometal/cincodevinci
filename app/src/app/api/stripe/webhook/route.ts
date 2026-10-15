import { NextResponse } from 'next/server'
import { addOrder, addSubscriber } from '@/lib/store'
import { stripe, stripeReady } from '@/lib/stripe'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!stripeReady() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return NextResponse.json({ error: `signature check failed: ${(e as Error).message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    let items: { name: string; size: string; qty: number }[] = []
    try {
      const li = await stripe().checkout.sessions.listLineItems(s.id, { limit: 50 })
      items = li.data.map((l) => {
        const [name, size] = (l.description || '').split(' — ')
        return { name: name || l.description || '', size: size || '', qty: l.quantity || 1 }
      })
    } catch { /* order still worth recording without the breakdown */ }

    await addOrder({
      sessionId: s.id,
      email: s.customer_details?.email || '',
      amount: s.amount_total ?? 0,
      currency: s.currency || 'usd',
      items,
      status: s.payment_status || 'paid',
    })

    /* A buyer who ticked the Stripe marketing box joins the list. */
    if (s.customer_details?.email && s.consent?.promotions === 'opt_in') {
      await addSubscriber({
        kind: 'email',
        value: s.customer_details.email.toLowerCase(),
        confirmed: true,
        consentText: 'Opted in to marketing at Stripe checkout.',
        ip: '',
      })
    }
  }

  return NextResponse.json({ received: true })
}
