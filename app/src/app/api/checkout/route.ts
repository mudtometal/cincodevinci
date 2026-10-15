import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/store'
import { stripe, stripeReady } from '@/lib/stripe'

export const runtime = 'nodejs'

type Line = { id: string; size: string; qty: number }

export async function POST(req: Request) {
  if (!stripeReady()) {
    return NextResponse.json({ error: 'Checkout opens as soon as the Stripe account is connected.' }, { status: 503 })
  }

  let body: { items?: Line[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const items = (body.items || []).slice(0, 20)
  if (!items.length) return NextResponse.json({ error: 'Bag is empty' }, { status: 400 })

  /* Prices come from the database, never from the browser. */
  const products = await getCollection('products')
  const settings = await getCollection('settings')

  const line_items = []
  for (const it of items) {
    const p = products.find((x) => x.id === it.id && x.show)
    if (!p) return NextResponse.json({ error: 'That item is no longer available' }, { status: 400 })
    if (p.sizes.length && !p.sizes.includes(it.size)) return NextResponse.json({ error: 'Pick a size' }, { status: 400 })
    if (p.soldOut.includes(it.size)) return NextResponse.json({ error: `${p.name} ${it.size} is sold out` }, { status: 400 })
    const qty = Math.max(1, Math.min(9, Math.floor(Number(it.qty) || 1)))

    line_items.push({
      quantity: qty,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(p.price * 100),
        product_data: {
          name: p.sizes.length > 1 ? `${p.name} — ${it.size}` : p.name,
          images: p.img.startsWith('http') ? [p.img] : undefined,
        },
      },
    })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/?paid=1`,
      cancel_url: `${origin}/#shop`,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'IE', 'DE', 'FR', 'NL', 'CZ', 'AU'] },
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      metadata: { site: settings.name },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('checkout failed', e)
    return NextResponse.json({ error: 'Could not start checkout. Try again in a moment.' }, { status: 502 })
  }
}
