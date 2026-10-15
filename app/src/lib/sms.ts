export const smsReady = () =>
  !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_FROM_NUMBER

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!smsReady()) return { ok: false, error: 'SMS is not connected yet' }
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER!, Body: body }),
  })
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` }
  return { ok: true }
}

export async function sendBulkSms(numbers: string[], body: string) {
  let sent = 0
  const failures: string[] = []
  for (const n of numbers) {
    const r = await sendSms(n, body)
    r.ok ? sent++ : failures.push(n)
  }
  return { sent, failures }
}

/** Store E.164 only — anything else will fail silently at send time. */
export function normalisePhone(raw: string, defaultCountry = '1'): string | null {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return /^\+\d{8,15}$/.test(digits) ? digits : null
  const d = digits.replace(/\D/g, '')
  if (d.length === 10) return `+${defaultCountry}${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return d.length >= 8 && d.length <= 15 ? `+${d}` : null
}
