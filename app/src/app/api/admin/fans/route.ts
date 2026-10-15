import { NextResponse } from 'next/server'
import { listSubscribers, unsubscribe, listOrders } from '@/lib/store'
import { requireAdmin } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny
  const url = new URL(req.url)

  if (url.searchParams.get('format') === 'csv') {
    const rows = await listSubscribers()
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      'type,contact,joined,active,consent',
      ...rows.map((r) =>
        [r.kind, r.value, r.createdAt, r.unsubscribedAt ? 'no' : 'yes', r.consentText].map(esc).join(','),
      ),
    ].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cincodevinci-list-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const [subs, orders] = await Promise.all([listSubscribers(), listOrders()])
  return NextResponse.json({ subscribers: subs, orders })
}

export async function DELETE(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny
  const { kind, value } = await req.json()
  if (kind !== 'email' && kind !== 'phone') return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  await unsubscribe(kind, String(value))
  return NextResponse.json({ ok: true })
}
