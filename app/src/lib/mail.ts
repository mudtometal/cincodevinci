export const mailReady = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM

type SendArgs = { to: string | string[]; subject: string; html: string; text?: string }

export async function sendMail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  if (!mailReady()) return { ok: false, error: 'Email is not connected yet' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html, text }),
  })
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` }
  return { ok: true }
}

/* Resend caps a single call at 100 recipients; batch and stay inside it. */
export async function sendBulk(recipients: string[], subject: string, html: string) {
  let sent = 0
  const failures: string[] = []
  for (let i = 0; i < recipients.length; i += 50) {
    const chunk = recipients.slice(i, i + 50)
    const r = await Promise.all(chunk.map((to) => sendMail({ to, subject, html })))
    r.forEach((x, j) => (x.ok ? sent++ : failures.push(chunk[j])))
  }
  return { sent, failures }
}
