import { NextResponse } from 'next/server'
import { addSubscriber } from '@/lib/store'
import { mailReady, sendMail } from '@/lib/mail'
import { normalisePhone, smsReady, sendSms } from '@/lib/sms'
import { getCollection } from '@/lib/store'

export const runtime = 'nodejs'

const hits = new Map<string, { n: number; t: number }>()
function rateLimited(ip: string) {
  const now = Date.now()
  const r = hits.get(ip)
  if (!r || now - r.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false }
  r.n += 1
  return r.n > 8
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: 'Slow down a second' }, { status: 429 })

  let body: { kind?: string; value?: string; consentText?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const kind = body.kind === 'phone' ? 'phone' : 'email'
  const raw = (body.value || '').trim()
  if (!raw) return NextResponse.json({ error: 'Nothing entered' }, { status: 400 })

  let value = raw
  if (kind === 'email') {
    value = raw.toLowerCase()
    if (!EMAIL_RE.test(value)) return NextResponse.json({ error: 'That email looks wrong' }, { status: 400 })
  } else {
    const n = normalisePhone(raw)
    if (!n) return NextResponse.json({ error: 'That number looks wrong' }, { status: 400 })
    value = n
  }

  /* A database blip must not hand a fan a stack trace. */
  try {
    await addSubscriber({
      kind,
      value,
      confirmed: true,
      consentText: (body.consentText || '').slice(0, 1000),
      ip,
    })
  } catch (e) {
    console.error('[subscribe] could not save', e)
    return NextResponse.json({ error: 'Could not save that right now — try again in a moment' }, { status: 503 })
  }

  const settings = await getCollection('settings')

  try {
    if (kind === 'email' && mailReady()) {
    await sendMail({
      to: value,
      subject: `You're on the ${settings.name} list`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;background:#000;color:#F2F0EC;padding:40px 24px">
        <p style="letter-spacing:.24em;text-transform:uppercase;font-size:11px;margin:0 0 20px">${settings.name}</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px">You're on the list. New music, videos and drops land here first.</p>
        <p style="font-size:11px;color:#7A7872;margin:0">Didn't sign up? Ignore this and you'll hear nothing more.</p>
      </div>`,
      text: `You're on the ${settings.name} list. New music, videos and drops land here first.`,
    })
  }

    if (kind === 'phone' && smsReady()) {
      await sendSms(value, `${settings.name}: you're on the list. Drops and shows only. Reply STOP to quit.`)
    }
  } catch (e) {
    console.error('[subscribe] saved, but the welcome message failed', e)
  }

  return NextResponse.json({
    ok: true,
    message: kind === 'email' ? 'You are on the list' : 'Number saved',
  })
}
