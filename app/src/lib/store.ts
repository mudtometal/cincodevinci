import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { defaults } from './defaults'
import type { Collections, CollectionKey, Subscriber, Order, StoredImage } from './types'

/**
 * Two interchangeable backends:
 *   DATABASE_URL set  -> Postgres (Supabase / Neon / Vercel Postgres / anything)
 *   DATABASE_URL unset -> a JSON file on disk (local development only)
 * Nothing above this layer knows or cares which one is live.
 */

export const usingPostgres = () => !!process.env.DATABASE_URL

export const newId = (p = '') => p + crypto.randomBytes(6).toString('hex')

/* ─────────────────────────── file backend ─────────────────────────── */

const FILE = path.join(process.cwd(), '.data', 'db.json')

type FileShape = {
  collections: Partial<Collections>
  subscribers: Subscriber[]
  orders: Order[]
  images: StoredImage[]
}

const emptyFile = (): FileShape => ({ collections: {}, subscribers: [], orders: [], images: [] })

async function readFile(): Promise<FileShape> {
  try {
    return { ...emptyFile(), ...JSON.parse(await fs.readFile(FILE, 'utf8')) }
  } catch {
    return emptyFile()
  }
}

async function writeFile(d: FileShape) {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(d, null, 2))
}

/* ───────────────────────── postgres backend ───────────────────────── */

type PoolLike = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> }
const g = globalThis as unknown as { __cdvPool?: PoolLike; __cdvReady?: Promise<void> }

async function pool(): Promise<PoolLike> {
  if (!g.__cdvPool) {
    const { Pool } = await import('pg')
    g.__cdvPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '') ? undefined : { rejectUnauthorized: false },
      max: 3,
    }) as unknown as PoolLike
  }
  if (!g.__cdvReady) g.__cdvReady = migrate(g.__cdvPool!)
  await g.__cdvReady
  return g.__cdvPool!
}

async function migrate(p: PoolLike) {
  await p.query(`CREATE TABLE IF NOT EXISTS cdv_kv (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS cdv_subscribers (
    id text PRIMARY KEY,
    kind text NOT NULL,
    value text NOT NULL,
    confirmed boolean NOT NULL DEFAULT false,
    consent_text text NOT NULL DEFAULT '',
    ip text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    unsubscribed_at timestamptz
  )`)
  await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS cdv_sub_uniq ON cdv_subscribers (kind, value)`)
  await p.query(`CREATE TABLE IF NOT EXISTS cdv_orders (
    id text PRIMARY KEY,
    session_id text UNIQUE NOT NULL,
    email text NOT NULL DEFAULT '',
    amount integer NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'usd',
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS cdv_images (
    id text PRIMARY KEY,
    mime text NOT NULL,
    data text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`)
}

/* ──────────────────────────── public API ──────────────────────────── */

export async function getCollection<K extends CollectionKey>(key: K): Promise<Collections[K]> {
  /* A read must never take the public site down. If the database is unreachable
     the seeded content is served instead, and the site stays up. */
  try {
    if (usingPostgres()) {
      const p = await pool()
      const { rows } = await p.query('SELECT value FROM cdv_kv WHERE key = $1', [key])
      if (rows.length) return rows[0].value as Collections[K]
      return defaults[key]
    }
    const d = await readFile()
    return (d.collections[key] ?? defaults[key]) as Collections[K]
  } catch (e) {
    console.error(`[store] could not read "${key}" — serving defaults`, e)
    return defaults[key]
  }
}

export async function setCollection<K extends CollectionKey>(key: K, value: Collections[K]): Promise<void> {
  if (usingPostgres()) {
    const p = await pool()
    await p.query(
      `INSERT INTO cdv_kv (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    )
    return
  }
  const d = await readFile()
  d.collections[key] = value as any
  await writeFile(d)
}

export async function getAll(): Promise<Collections> {
  const keys = Object.keys(defaults) as CollectionKey[]
  const out = {} as Collections
  await Promise.all(keys.map(async (k) => { (out as any)[k] = await getCollection(k) }))
  return out
}

/* subscribers */

export async function addSubscriber(
  s: Omit<Subscriber, 'id' | 'createdAt'>,
): Promise<{ created: boolean }> {
  const row: Subscriber = { ...s, id: newId('sub_'), createdAt: new Date().toISOString() }
  if (usingPostgres()) {
    const p = await pool()
    const { rows } = await p.query(
      `INSERT INTO cdv_subscribers (id, kind, value, confirmed, consent_text, ip)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (kind, value) DO UPDATE SET unsubscribed_at = NULL
       RETURNING (xmax = 0) AS inserted`,
      [row.id, row.kind, row.value, row.confirmed, row.consentText, row.ip],
    )
    return { created: !!rows[0]?.inserted }
  }
  const d = await readFile()
  const hit = d.subscribers.find((x) => x.kind === row.kind && x.value === row.value)
  if (hit) { hit.unsubscribedAt = null; await writeFile(d); return { created: false } }
  d.subscribers.push(row)
  await writeFile(d)
  return { created: true }
}

export async function listSubscribers(kind?: 'email' | 'phone'): Promise<Subscriber[]> {
  if (usingPostgres()) {
    const p = await pool()
    const { rows } = await p.query(
      `SELECT id, kind, value, confirmed, consent_text AS "consentText", ip,
              created_at AS "createdAt", unsubscribed_at AS "unsubscribedAt"
       FROM cdv_subscribers ${kind ? 'WHERE kind = $1' : ''} ORDER BY created_at DESC`,
      kind ? [kind] : [],
    )
    return rows as Subscriber[]
  }
  const d = await readFile()
  return d.subscribers
    .filter((s) => !kind || s.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function unsubscribe(kind: 'email' | 'phone', value: string): Promise<void> {
  if (usingPostgres()) {
    const p = await pool()
    await p.query('UPDATE cdv_subscribers SET unsubscribed_at = now() WHERE kind=$1 AND value=$2', [kind, value])
    return
  }
  const d = await readFile()
  const hit = d.subscribers.find((x) => x.kind === kind && x.value === value)
  if (hit) hit.unsubscribedAt = new Date().toISOString()
  await writeFile(d)
}

/* orders */

export async function addOrder(o: Omit<Order, 'id' | 'createdAt'>): Promise<void> {
  if (usingPostgres()) {
    const p = await pool()
    await p.query(
      `INSERT INTO cdv_orders (id, session_id, email, amount, currency, items, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (session_id) DO NOTHING`,
      [newId('ord_'), o.sessionId, o.email, o.amount, o.currency, JSON.stringify(o.items), o.status],
    )
    return
  }
  const d = await readFile()
  if (d.orders.some((x) => x.sessionId === o.sessionId)) return
  d.orders.push({ ...o, id: newId('ord_'), createdAt: new Date().toISOString() })
  await writeFile(d)
}

export async function listOrders(): Promise<Order[]> {
  if (usingPostgres()) {
    const p = await pool()
    const { rows } = await p.query(
      `SELECT id, session_id AS "sessionId", email, amount, currency, items, status,
              created_at AS "createdAt" FROM cdv_orders ORDER BY created_at DESC LIMIT 200`,
    )
    return rows as Order[]
  }
  const d = await readFile()
  return d.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/* uploaded images — kept in the database so no extra storage account is needed */

export async function putImage(mime: string, data: string): Promise<string> {
  const id = newId('img_')
  if (usingPostgres()) {
    const p = await pool()
    await p.query('INSERT INTO cdv_images (id, mime, data) VALUES ($1,$2,$3)', [id, mime, data])
    return id
  }
  const d = await readFile()
  d.images.push({ id, mime, data, createdAt: new Date().toISOString() })
  await writeFile(d)
  return id
}

export async function getImage(id: string): Promise<StoredImage | null> {
  if (usingPostgres()) {
    const p = await pool()
    const { rows } = await p.query('SELECT id, mime, data, created_at AS "createdAt" FROM cdv_images WHERE id=$1', [id])
    return (rows[0] as StoredImage) ?? null
  }
  const d = await readFile()
  return d.images.find((x) => x.id === id) ?? null
}
