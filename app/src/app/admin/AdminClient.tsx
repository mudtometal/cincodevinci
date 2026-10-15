'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Field, Text, Area, Switch, Thumb } from './ui'
import { PLATFORMS } from '@/lib/defaults'
import type { Collections, CollectionKey, Order, Subscriber } from '@/lib/types'

type Status = { database: boolean; payments: boolean; email: boolean; sms: boolean }
const TABS = ['Home', 'Links', 'Music', 'Video', 'Shows', 'Shop', 'Fans', 'Send', 'Setup'] as const
type Tab = (typeof TABS)[number]

const uid = (p: string) => p + Math.random().toString(36).slice(2, 8)
const move = <T,>(a: T[], i: number, d: number): T[] => {
  const j = i + d
  if (j < 0 || j >= a.length) return a
  const c = a.slice()
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

/* ─────────────────────────── login ─────────────────────────── */

function Login({ onIn }: { onIn: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const r = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (r.ok) onIn(); else setErr(j.error || 'Wrong password')
  }

  return (
    <div className="ad login">
      <form onSubmit={go}>
        <div className="mark">Cincodevinci</div>
        <Field>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus />
        </Field>
        <button className="btn" type="submit" disabled={busy || !pw}>{busy ? '…' : 'Sign in'}</button>
        {err && <div className="hint" style={{ color: '#C8342B' }}>{err}</div>}
      </form>
    </div>
  )
}

/* ─────────────────────────── shell ─────────────────────────── */

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [data, setData] = useState<Collections | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [tab, setTab] = useState<Tab>('Home')
  const [toast, setToast] = useState<{ m: string; bad?: boolean } | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const say = useCallback((m: string, bad?: boolean) => {
    setToast({ m, bad })
    setTimeout(() => setToast(null), bad ? 3600 : 1500)
  }, [])

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/data')
    if (r.status === 401) { setAuthed(false); return }
    const j = await r.json()
    setData(j.data); setStatus(j.status); setAuthed(true)
  }, [])

  useEffect(() => { load() }, [load])

  /** Local state updates instantly; the server catches up a beat later. */
  const patch = useCallback(<K extends CollectionKey>(key: K, value: Collections[K]) => {
    setData((d) => (d ? { ...d, [key]: value } : d))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      const r = await fetch('/api/admin/data', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (r.ok) say('Saved')
      else say((await r.json().catch(() => ({}))).error || 'Did not save', true)
    }, 600)
  }, [say])

  if (authed === null) return <div className="ad login"><div className="mark">…</div></div>
  if (authed === false) return <Login onIn={load} />
  if (!data || !status) return <div className="ad login"><div className="mark">…</div></div>

  const P = { data, patch, say, status }

  return (
    <div className="ad">
      <div className="adbar">
        <div className="top">
          <span className="mark">{data.settings.name}</span>
          <div className="btnrow">
            <a className="btn ghost sm" href="/" target="_blank" rel="noreferrer">View site</a>
            <button className="btn ghost sm" onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthed(false) }}>
              Sign out
            </button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t}
              aria-current={t === tab}
              onClick={(e) => { setTab(t); e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) }}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="adwrap">
        {tab === 'Home' && <Home {...P} />}
        {tab === 'Links' && <Links {...P} />}
        {tab === 'Music' && <Music {...P} />}
        {tab === 'Video' && <Vids {...P} />}
        {tab === 'Shows' && <Shows {...P} />}
        {tab === 'Shop' && <Shop {...P} />}
        {tab === 'Fans' && <Fans say={say} />}
        {tab === 'Send' && <Send status={status} say={say} />}
        {tab === 'Setup' && <Setup status={status} />}
      </div>

      <div className={'toast' + (toast ? ' on' : '') + (toast?.bad ? ' bad' : '')}>{toast?.m}</div>
    </div>
  )
}

type Props = {
  data: Collections
  patch: <K extends CollectionKey>(k: K, v: Collections[K]) => void
  say: (m: string, bad?: boolean) => void
  status: Status
}

/* ─────────────────────────── Home ─────────────────────────── */

function Home({ data, patch, say }: Props) {
  const s = data.settings
  const set = (v: Partial<typeof s>) => patch('settings', { ...s, ...v })
  const setF = (v: Partial<typeof s.featured>) => set({ featured: { ...s.featured, ...v } })
  const setT = (v: Partial<typeof s.teaser>) => set({ teaser: { ...s.teaser, ...v } })

  return (
    <div className="adsec">
      <div className="lhead"><h2>Front page</h2></div>

      <div className="card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Thumb src={s.featured.art} onChange={(url) => setF({ art: url })} onError={(m) => say(m, true)} />
          <div style={{ flex: 1, display: 'grid', gap: 14, minWidth: 0 }}>
            <Field label="Title"><Text value={s.featured.title} onChange={(v) => setF({ title: v })} /></Field>
            <Field label="Line under it"><Text value={s.featured.sub} onChange={(v) => setF({ sub: v })} /></Field>
          </div>
        </div>
        <Field label="Where the big picture links to">
          <Text type="url" value={s.featured.url} onChange={(v) => setF({ url: v })} placeholder="https://" />
        </Field>
      </div>

      <div className="card">
        <Switch on={s.teaser.on} onChange={(v) => setT({ on: v })} label="Show a countdown" />
        {s.teaser.on && (
          <>
            <Field label="What's coming"><Text value={s.teaser.title} onChange={(v) => setT({ title: v })} placeholder="New single" /></Field>
            <div className="row2">
              <Field label="Date and time">
                <input type="datetime-local" value={toLocal(s.teaser.at)} onChange={(e) => setT({ at: fromLocal(e.target.value) })} />
              </Field>
              <Field label="Link (optional)"><Text type="url" value={s.teaser.url} onChange={(v) => setT({ url: v })} placeholder="https://" /></Field>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <Field label="Mailing list blurb"><Area value={s.joinLede} onChange={(v) => set({ joinLede: v })} /></Field>
        <Switch on={s.smsEnabled} onChange={(v) => set({ smsEnabled: v })} label="Also collect phone numbers" />
        {s.smsEnabled && <Field label="Text list blurb"><Text value={s.smsLede} onChange={(v) => set({ smsLede: v })} /></Field>}
      </div>

      <div className="card">
        <div className="row2">
          <Field label="Artist name"><Text value={s.name} onChange={(v) => set({ name: v })} /></Field>
          <Field label="Contact email"><Text type="email" value={s.contactEmail} onChange={(v) => set({ contactEmail: v })} /></Field>
        </div>
        <Field label="Footer line"><Text value={s.footer} onChange={(v) => set({ footer: v })} /></Field>
        <Field label="Small print under Add to bag"><Text value={s.shipFine} onChange={(v) => set({ shipFine: v })} /></Field>
      </div>
    </div>
  )
}

const toLocal = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : '')

/* ─────────────────────────── Links ─────────────────────────── */

function Links({ data, patch }: Props) {
  const rows = data.links
  const set = (i: number, v: Partial<(typeof rows)[number]>) =>
    patch('links', rows.map((r, j) => (j === i ? { ...r, ...v } : r)))

  return (
    <div className="adsec">
      <div className="lhead">
        <h2>Links</h2>
        <span className="sub">Leave blank to hide</span>
      </div>
      {rows.map((l, i) => (
        <div className="card" key={l.id}>
          <div className="hd">
            <span className="nm">{PLATFORMS.find((p) => p.id === l.id)?.label || l.label}</span>
            <Switch on={l.show && !!l.url} onChange={(v) => set(i, { show: v })} label="" />
          </div>
          <Field><Text type="url" value={l.url} onChange={(v) => set(i, { url: v, show: v ? l.show : false })} placeholder="https://" /></Field>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── Music ─────────────────────────── */

function Music({ data, patch, say }: Props) {
  const rows = data.releases
  const [busy, setBusy] = useState(false)
  const set = (i: number, v: Partial<(typeof rows)[number]>) =>
    patch('releases', rows.map((r, j) => (j === i ? { ...r, ...v } : r)))

  const sync = async () => {
    setBusy(true)
    const r = await fetch('/api/admin/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what: 'releases' }),
    })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    const msg = j?.result?.releases || 'Done'
    say(msg, /could not/i.test(msg))
    if (!/could not/i.test(msg)) location.reload()
  }

  return (
    <div className="adsec">
      <div className="lhead">
        <h2>Music</h2>
        <button className="btn ghost sm" onClick={sync} disabled={busy}>{busy ? '…' : 'Get from Apple'}</button>
      </div>
      <span className="sub">Pulls everything you&apos;ve released. Turn off anything you don&apos;t want shown.</span>

      {rows.map((r, i) => (
        <div className="card" key={r.id}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Thumb src={r.art} onChange={(url) => set(i, { art: url, source: 'manual' })} onError={(m) => say(m, true)} />
            <div style={{ flex: 1, display: 'grid', gap: 12, minWidth: 0 }}>
              <Field label="Title"><Text value={r.title} onChange={(v) => set(i, { title: v, source: 'manual' })} /></Field>
              <div className="row2">
                <Field label="Year"><Text value={r.year} onChange={(v) => set(i, { year: v, source: 'manual' })} placeholder="2026" /></Field>
                <Field label="Type"><Text value={r.kind} onChange={(v) => set(i, { kind: v, source: 'manual' })} placeholder="Single / EP / Album" /></Field>
              </div>
            </div>
          </div>
          <div className="hd">
            <Switch on={r.show} onChange={(v) => set(i, { show: v })} label={r.show ? 'Showing' : 'Hidden'} />
            <div className="tools">
              <button className="ic" onClick={() => patch('releases', move(rows, i, -1))} aria-label="Up">↑</button>
              <button className="ic" onClick={() => patch('releases', move(rows, i, 1))} aria-label="Down">↓</button>
              <button className="ic danger" onClick={() => patch('releases', rows.filter((_, j) => j !== i))} aria-label="Delete">×</button>
            </div>
          </div>
        </div>
      ))}

      <button className="btn ghost" onClick={() => patch('releases', [{ id: uid('r-'), title: 'New release', year: String(new Date().getFullYear()), kind: 'Single', art: '', show: true, source: 'manual' as const }, ...rows])}>
        Add by hand
      </button>
    </div>
  )
}

/* ─────────────────────────── Video ─────────────────────────── */

function Vids({ data, patch, say }: Props) {
  const rows = data.videos
  const [busy, setBusy] = useState(false)
  const set = (i: number, v: Partial<(typeof rows)[number]>) =>
    patch('videos', rows.map((r, j) => (j === i ? { ...r, ...v } : r)))

  const sync = async () => {
    setBusy(true)
    const r = await fetch('/api/admin/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what: 'videos' }),
    })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    const msg = j?.result?.videos || 'Done'
    say(msg, /could not/i.test(msg))
    if (!/could not/i.test(msg)) location.reload()
  }

  return (
    <div className="adsec">
      <div className="lhead">
        <h2>Video</h2>
        <button className="btn ghost sm" onClick={sync} disabled={busy}>{busy ? '…' : 'Get from YouTube'}</button>
      </div>
      <span className="sub">Newest six show on the site.</span>

      {!rows.length && <div className="empty">Nothing yet — hit Get from YouTube.</div>}

      {rows.map((v, i) => (
        <div className="card" key={v.id}>
          <Thumb wide src={v.thumb} onChange={(url) => set(i, { thumb: url, source: 'manual' })} onError={(m) => say(m, true)} />
          <Field label="Title"><Text value={v.title} onChange={(t) => set(i, { title: t, source: 'manual' })} /></Field>
          <Field label="Link"><Text type="url" value={v.url} onChange={(u) => set(i, { url: u, source: 'manual' })} placeholder="https://" /></Field>
          <div className="hd">
            <Switch on={v.show} onChange={(x) => set(i, { show: x })} label={v.show ? 'Showing' : 'Hidden'} />
            <div className="tools">
              <button className="ic" onClick={() => patch('videos', move(rows, i, -1))} aria-label="Up">↑</button>
              <button className="ic" onClick={() => patch('videos', move(rows, i, 1))} aria-label="Down">↓</button>
              <button className="ic danger" onClick={() => patch('videos', rows.filter((_, j) => j !== i))} aria-label="Delete">×</button>
            </div>
          </div>
        </div>
      ))}

      <button className="btn ghost" onClick={() => patch('videos', [{ id: uid('v-'), title: 'New video', date: new Date().toISOString().slice(0, 10), thumb: '', url: '', show: true, source: 'manual' as const }, ...rows])}>
        Add by hand
      </button>
    </div>
  )
}

/* ─────────────────────────── Shows ─────────────────────────── */

function Shows({ data, patch }: Props) {
  const rows = data.shows
  const set = (i: number, v: Partial<(typeof rows)[number]>) =>
    patch('shows', rows.map((r, j) => (j === i ? { ...r, ...v } : r)))

  return (
    <div className="adsec">
      <div className="lhead"><h2>Shows</h2></div>

      {!rows.length && <div className="empty">No dates up.</div>}

      {rows.map((s, i) => (
        <div className="card" key={s.id}>
          <div className="row2">
            <Field label="Date"><Text value={s.date} onChange={(v) => set(i, { date: v })} placeholder="14 Nov" /></Field>
            <Field label="City"><Text value={s.city} onChange={(v) => set(i, { city: v })} placeholder="Allentown, PA" /></Field>
          </div>
          <Field label="Venue"><Text value={s.venue} onChange={(v) => set(i, { venue: v })} /></Field>
          <Field label="Ticket link"><Text type="url" value={s.url} onChange={(v) => set(i, { url: v })} placeholder="https://" /></Field>
          <div className="hd">
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <Switch on={s.show} onChange={(v) => set(i, { show: v })} label={s.show ? 'Showing' : 'Hidden'} />
              <Switch on={s.soldOut} onChange={(v) => set(i, { soldOut: v })} label="Sold out" />
            </div>
            <div className="tools">
              <button className="ic" onClick={() => patch('shows', move(rows, i, -1))} aria-label="Up">↑</button>
              <button className="ic" onClick={() => patch('shows', move(rows, i, 1))} aria-label="Down">↓</button>
              <button className="ic danger" onClick={() => patch('shows', rows.filter((_, j) => j !== i))} aria-label="Delete">×</button>
            </div>
          </div>
        </div>
      ))}

      <button className="btn ghost" onClick={() => patch('shows', [...rows, { id: uid('s-'), date: '', venue: '', city: '', url: '', soldOut: false, show: true }])}>
        Add a show
      </button>
    </div>
  )
}

/* ─────────────────────────── Shop ─────────────────────────── */

function Shop({ data, patch, say, status }: Props) {
  const rows = data.products
  const pol = data.policies
  const set = (i: number, v: Partial<(typeof rows)[number]>) =>
    patch('products', rows.map((r, j) => (j === i ? { ...r, ...v } : r)))

  return (
    <div className="adsec">
      <div className="lhead"><h2>Shop</h2></div>
      {!status.payments && <span className="sub">Items show on the site, but nobody can pay until Stripe is connected. See Setup.</span>}

      {rows.map((p, i) => (
        <div className="card" key={p.id}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Thumb src={p.img} onChange={(url) => set(i, { img: url })} onError={(m) => say(m, true)} />
            <div style={{ flex: 1, display: 'grid', gap: 12, minWidth: 0 }}>
              <Field label="Name"><Text value={p.name} onChange={(v) => set(i, { name: v })} /></Field>
              <Field label="Price in dollars">
                {/* An empty box reads as empty, not as 0 — otherwise clearing the
                    field and retyping leaves a leading zero behind. */}
                <input
                  type="number" min={0} step={1} inputMode="decimal"
                  value={p.price === 0 ? '' : String(p.price)}
                  placeholder="0"
                  onChange={(e) => {
                    const v = e.target.value.replace(/^0+(?=\d)/, '')
                    set(i, { price: v === '' ? 0 : Math.max(0, Number(v) || 0) })
                  }}
                />
              </Field>
            </div>
          </div>
          <Field label="Description"><Area value={p.desc} onChange={(v) => set(i, { desc: v })} /></Field>
          <div className="row2">
            <Field label="Sizes" hint="Comma separated. Leave blank if there are no sizes.">
              <Text value={p.sizes.join(', ')} onChange={(v) => set(i, { sizes: splitList(v) })} placeholder="S, M, L, XL" />
            </Field>
            <Field label="Sold out sizes">
              <Text value={p.soldOut.join(', ')} onChange={(v) => set(i, { soldOut: splitList(v) })} placeholder="XXL" />
            </Field>
          </div>
          <div className="hd">
            <Switch on={p.show} onChange={(v) => set(i, { show: v })} label={p.show ? 'In the shop' : 'Hidden'} />
            <div className="tools">
              <button className="ic" onClick={() => patch('products', move(rows, i, -1))} aria-label="Up">↑</button>
              <button className="ic" onClick={() => patch('products', move(rows, i, 1))} aria-label="Down">↓</button>
              <button className="ic danger" onClick={() => patch('products', rows.filter((_, j) => j !== i))} aria-label="Delete">×</button>
            </div>
          </div>
        </div>
      ))}

      <button className="btn ghost" onClick={() => patch('products', [...rows, { id: uid('p-'), name: 'New item', price: 40, img: '', desc: '', sizes: ['S', 'M', 'L', 'XL'], soldOut: [], show: false }])}>
        Add an item
      </button>

      <div className="lhead" style={{ marginTop: 26 }}><h2>Shop info</h2></div>
      {pol.map((x, i) => (
        <div className="card" key={x.id}>
          <Field label="Heading"><Text value={x.title} onChange={(v) => patch('policies', pol.map((r, j) => (j === i ? { ...r, title: v } : r)))} /></Field>
          <Field label="Text"><Area value={x.body} onChange={(v) => patch('policies', pol.map((r, j) => (j === i ? { ...r, body: v } : r)))} /></Field>
          <div className="hd">
            <span />
            <button className="ic danger" onClick={() => patch('policies', pol.filter((_, j) => j !== i))} aria-label="Delete">×</button>
          </div>
        </div>
      ))}
      <button className="btn ghost" onClick={() => patch('policies', [...pol, { id: uid('pol-'), title: 'New', body: '' }])}>
        Add a section
      </button>
    </div>
  )
}

const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean)

/* ─────────────────────────── Fans ─────────────────────────── */

function Fans({ say }: { say: (m: string, bad?: boolean) => void }) {
  const [subs, setSubs] = useState<Subscriber[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/fans')
    if (!r.ok) return
    const j = await r.json()
    setSubs(j.subscribers); setOrders(j.orders)
  }, [])
  useEffect(() => { load() }, [load])

  if (!subs) return <div className="empty">…</div>

  const live = subs.filter((s) => !s.unsubscribedAt)
  const emails = live.filter((s) => s.kind === 'email').length
  const phones = live.filter((s) => s.kind === 'phone').length

  const drop = async (s: Subscriber) => {
    await fetch('/api/admin/fans', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: s.kind, value: s.value }),
    })
    say('Removed'); load()
  }

  return (
    <div className="adsec">
      <div className="lhead">
        <h2>Fans</h2>
        <a className="btn ghost sm" href="/api/admin/fans?format=csv">Download list</a>
      </div>

      <div className="nums">
        <div><span className="big">{emails}</span><span>emails</span></div>
        <div><span className="big">{phones}</span><span>numbers</span></div>
        <div><span className="big">{orders.length}</span><span>orders</span></div>
      </div>

      {!subs.length ? <div className="empty">Nobody has signed up yet.</div> : (
        <table className="tbl">
          <thead><tr><th>Contact</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {subs.slice(0, 200).map((s) => (
              <tr key={s.id}>
                <td className={s.unsubscribedAt ? 'off' : ''}>{s.value}</td>
                <td style={{ color: '#7A7872' }}>{s.createdAt.slice(0, 10)}</td>
                <td className="r">
                  {!s.unsubscribedAt && <button className="ic danger" onClick={() => drop(s)} aria-label="Remove">×</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {orders.length > 0 && (
        <>
          <div className="lhead" style={{ marginTop: 28 }}><h2>Orders</h2></div>
          <table className="tbl">
            <thead><tr><th>Who</th><th>What</th><th className="r">Paid</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.email || '—'}</td>
                  <td style={{ color: '#7A7872' }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || '—'}</td>
                  <td className="r">${(o.amount / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────── Send ─────────────────────────── */

function Send({ status, say }: { status: Status; say: (m: string, bad?: boolean) => void }) {
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [testTo, setTestTo] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = channel === 'email' ? status.email : status.sms

  const fire = async (test?: string) => {
    if (!test && !confirm(`Send to everyone on the ${channel === 'email' ? 'email' : 'text'} list?`)) return
    setBusy(true)
    const r = await fetch('/api/admin/broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, subject, body, test }),
    })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { say(j.error || 'Did not send', true); return }
    say(test ? 'Test sent' : `Sent to ${j.sent}`)
    if (!test) { setSubject(''); setBody('') }
  }

  return (
    <div className="adsec">
      <div className="lhead"><h2>Send</h2></div>

      <div className="btnrow">
        <button className={'btn ' + (channel === 'email' ? '' : 'ghost')} onClick={() => setChannel('email')}>Email</button>
        <button className={'btn ' + (channel === 'sms' ? '' : 'ghost')} onClick={() => setChannel('sms')}>Text</button>
      </div>

      {!ready && <span className="sub">{channel === 'email' ? 'Email' : 'Texting'} is not connected yet. See Setup.</span>}

      <div className="card">
        {channel === 'email' && (
          <Field label="Subject"><Text value={subject} onChange={setSubject} placeholder="New single out now" /></Field>
        )}
        <Field label="Message" hint={channel === 'sms' ? `${body.length}/320 — your name and STOP are added automatically` : undefined}>
          <Area value={body} onChange={setBody} placeholder={channel === 'sms' ? 'New single out now — link in bio' : 'Write it like a text. Short is better.'} />
        </Field>
      </div>

      <div className="card">
        <Field label="Send yourself a test first">
          <Text value={testTo} onChange={setTestTo} placeholder={channel === 'email' ? 'you@email.com' : '+1 555 000 0000'} />
        </Field>
        <div className="btnrow">
          <button className="btn ghost" disabled={busy || !ready || !testTo || !body} onClick={() => fire(testTo)}>Send test</button>
          <button className="btn" disabled={busy || !ready || !body} onClick={() => fire()}>Send to everyone</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Setup ─────────────────────────── */

function Setup({ status }: { status: Status }) {
  const rows: { on: boolean; name: string; note: string }[] = [
    { on: status.database, name: 'Database', note: status.database ? 'Connected' : 'Running on a temporary file — changes will not survive a restart' },
    { on: status.payments, name: 'Payments', note: status.payments ? 'Stripe connected' : 'Add the Stripe keys to take money' },
    { on: status.email, name: 'Email', note: status.email ? 'Resend connected' : 'Signups are saved, but nothing can be sent yet' },
    { on: status.sms, name: 'Texting', note: status.sms ? 'Twilio connected' : 'Numbers are saved, but nothing can be sent yet' },
  ]
  return (
    <div className="adsec">
      <div className="lhead"><h2>Setup</h2></div>
      <div>
        {rows.map((r) => (
          <div className="stat" key={r.name}>
            <span className={'dot ' + (r.on ? 'on' : 'off')} />
            <span className="tx"><b>{r.name}</b><span>{r.note}</span></span>
            <span className="pill">{r.on ? 'On' : 'Off'}</span>
          </div>
        ))}
      </div>
      <span className="sub">
        Anything switched off is a key your developer pastes into the hosting settings once. Nothing on this page changes it.
      </span>
    </div>
  )
}
