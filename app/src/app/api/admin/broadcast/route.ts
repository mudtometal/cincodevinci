import { NextResponse } from 'next/server'
import { listSubscribers, getCollection } from '@/lib/store'
import { sendBulk, mailReady } from '@/lib/mail'
import { sendBulkSms, smsReady } from '@/lib/sms'
import { requireAdmin } from '@/lib/guard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny

  const { channel, subject, body, test } = await req.json()
  const text = String(body || '').trim()
  if (!text) return NextResponse.json({ error: 'Write something first' }, { status: 400 })

  const settings = await getCollection('settings')

  if (channel === 'email') {
    if (!mailReady()) return NextResponse.json({ error: 'Email is not connected yet' }, { status: 503 })
    const subj = String(subject || '').trim()
    if (!subj) return NextResponse.json({ error: 'Add a subject line' }, { status: 400 })

    const html = `<div style="font-family:Helvetica,Arial,sans-serif;background:#000;color:#F2F0EC;padding:40px 24px">
      <p style="letter-spacing:.24em;text-transform:uppercase;font-size:11px;margin:0 0 22px">${settings.name}</p>
      <div style="font-size:15px;line-height:1.75;white-space:pre-wrap">${escapeHtml(text)}</div>
      <p style="font-size:11px;color:#7A7872;margin:28px 0 0">You signed up at ${settings.name}. Reply to this email to get off the list.</p>
    </div>`

    if (test) {
      const to = String(test)
      const r = await sendBulk([to], subj, html)
      return NextResponse.json({ ok: true, sent: r.sent, failed: r.failures.length, test: true })
    }

    const list = (await listSubscribers('email')).filter((s) => !s.unsubscribedAt).map((s) => s.value)
    if (!list.length) return NextResponse.json({ error: 'Nobody on the email list yet' }, { status: 400 })
    const r = await sendBulk(list, subj, html)
    return NextResponse.json({ ok: true, sent: r.sent, failed: r.failures.length })
  }

  if (channel === 'sms') {
    if (!smsReady()) return NextResponse.json({ error: 'SMS is not connected yet' }, { status: 503 })
    if (text.length > 320) return NextResponse.json({ error: 'Keep it under 320 characters' }, { status: 400 })
    const msg = `${settings.name}: ${text}\nReply STOP to quit.`

    if (test) {
      const r = await sendBulkSms([String(test)], msg)
      return NextResponse.json({ ok: true, sent: r.sent, failed: r.failures.length, test: true })
    }

    const list = (await listSubscribers('phone')).filter((s) => !s.unsubscribedAt).map((s) => s.value)
    if (!list.length) return NextResponse.json({ error: 'Nobody on the text list yet' }, { status: 400 })
    const r = await sendBulkSms(list, msg)
    return NextResponse.json({ ok: true, sent: r.sent, failed: r.failures.length })
  }

  return NextResponse.json({ error: 'Pick email or text' }, { status: 400 })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
