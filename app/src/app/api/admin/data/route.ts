import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAll, setCollection, usingPostgres } from '@/lib/store'
import { defaults } from '@/lib/defaults'
import { requireAdmin } from '@/lib/guard'
import { stripeReady } from '@/lib/stripe'
import { mailReady } from '@/lib/mail'
import { smsReady } from '@/lib/sms'
import type { CollectionKey } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const deny = await requireAdmin(); if (deny) return deny
  return NextResponse.json({
    data: await getAll(),
    status: {
      database: usingPostgres(),
      payments: stripeReady(),
      email: mailReady(),
      sms: smsReady(),
    },
  })
}

export async function PUT(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny

  let body: { key?: string; value?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const key = body.key as CollectionKey
  if (!key || !(key in defaults)) return NextResponse.json({ error: 'Unknown section' }, { status: 400 })
  if (body.value === undefined) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })

  await setCollection(key, body.value as never)
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
