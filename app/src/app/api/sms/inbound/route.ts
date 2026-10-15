import { unsubscribe, addSubscriber } from '@/lib/store'
import { normalisePhone } from '@/lib/sms'
import { getCollection } from '@/lib/store'

export const runtime = 'nodejs'

/** Twilio posts here on every inbound text. STOP and HELP are legally required. */
export async function POST(req: Request) {
  const form = await req.formData()
  const from = normalisePhone(String(form.get('From') || ''))
  const body = String(form.get('Body') || '').trim().toUpperCase()
  const settings = await getCollection('settings')

  let reply = ''
  if (from) {
    if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(body)) {
      await unsubscribe('phone', from)
      reply = `${settings.name}: you will not get any more texts. Reply START to rejoin.`
    } else if (['START', 'UNSTOP', 'YES'].includes(body)) {
      await addSubscriber({ kind: 'phone', value: from, confirmed: true, consentText: 'Re-opted in by texting START.', ip: '' })
      reply = `${settings.name}: you're back on. Reply STOP to quit.`
    } else if (body === 'HELP') {
      reply = `${settings.name}: drops and shows only. Reply STOP to quit. Help: ${settings.contactEmail}`
    }
  }

  const twiml = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply.replace(/[<>&]/g, '')}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
