import { NextResponse } from 'next/server'
import { passwordMatches, setSession, throttled, noteFailure, noteSuccess } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (throttled(ip)) return NextResponse.json({ error: 'Too many tries. Wait 15 minutes.' }, { status: 429 })

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'No password is set on the server yet (ADMIN_PASSWORD).' }, { status: 503 })
  }

  let password = ''
  try { password = String((await req.json()).password || '') } catch {}

  if (!passwordMatches(password)) {
    noteFailure(ip)
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  noteSuccess(ip)
  await setSession()
  return NextResponse.json({ ok: true })
}
