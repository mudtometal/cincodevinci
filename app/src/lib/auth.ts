import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'cdv_admin'
const TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days — the client should not be logging in weekly

function secret() {
  const s = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'dev-only-insecure-secret'
  return crypto.createHash('sha256').update(s).digest()
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function makeToken(): string {
  const exp = String(Date.now() + TTL_MS)
  return `${exp}.${sign(exp)}`
}

export function tokenValid(token: string | undefined): boolean {
  if (!token) return false
  const [exp, mac] = token.split('.')
  if (!exp || !mac) return false
  const expected = sign(exp)
  if (mac.length !== expected.length) return false
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false
  return Number(exp) > Date.now()
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies()
  return tokenValid(jar.get(COOKIE)?.value)
}

export async function setSession() {
  const jar = await cookies()
  jar.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_MS / 1000,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export function passwordMatches(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD || ''
  if (!real) return false
  const a = crypto.createHash('sha256').update(input).digest()
  const b = crypto.createHash('sha256').update(real).digest()
  return crypto.timingSafeEqual(a, b)
}

/* crude but effective brute-force brake, per process */
const attempts = new Map<string, { n: number; until: number }>()
export function throttled(ip: string): boolean {
  const r = attempts.get(ip)
  return !!r && r.until > Date.now()
}
export function noteFailure(ip: string) {
  const r = attempts.get(ip) ?? { n: 0, until: 0 }
  r.n += 1
  if (r.n >= 5) { r.until = Date.now() + 15 * 60 * 1000; r.n = 0 }
  attempts.set(ip, r)
}
export function noteSuccess(ip: string) { attempts.delete(ip) }
