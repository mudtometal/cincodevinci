import { NextResponse } from 'next/server'
import { putImage } from '@/lib/store'
import { requireAdmin } from '@/lib/guard'

export const runtime = 'nodejs'

const OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX = 1_500_000 // after the browser has already downscaled it

export async function POST(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny

  let body: { mime?: string; data?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const mime = String(body.mime || '')
  const data = String(body.data || '')
  if (!OK.includes(mime)) return NextResponse.json({ error: 'Use a JPG, PNG or WEBP' }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'No image' }, { status: 400 })
  if (Buffer.byteLength(data, 'base64') > MAX) return NextResponse.json({ error: 'That picture is too big' }, { status: 413 })

  const id = await putImage(mime, data)
  return NextResponse.json({ url: `/api/img/${id}` })
}
