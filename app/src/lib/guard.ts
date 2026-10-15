import { NextResponse } from 'next/server'
import { isAuthed } from './auth'

export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAuthed()) return null
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
}
