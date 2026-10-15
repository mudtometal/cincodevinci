'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Glyph } from './icons'
import SignupGate from './SignupGate'
import type { Collections, Product, Release } from '@/lib/types'

type Flags = { stripe: boolean; sms: boolean }
type BagLine = { k: string; id: string; n: string; s: string; q: number; p: number; img: string }

const money = (n: number) => '$' + n.toFixed(0)
const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

/* ───────────────────────── background video ───────────────────────── */

function Background() {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const kick = () => { v.play().catch(() => {}) }
    kick()
    v.addEventListener('loadeddata', kick)
    v.addEventListener('canplay', kick)
    const vis = () => { if (!document.hidden) kick() }
    document.addEventListener('visibilitychange', vis)
    const evs = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'] as const
    evs.forEach((e) => window.addEventListener(e, kick, { once: true, passive: true }))
    return () => {
      v.removeEventListener('loadeddata', kick)
      v.removeEventListener('canplay', kick)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return (
    <div className="bg">
      <video ref={ref} src="/bg.mp4" muted loop playsInline autoPlay preload="auto" aria-hidden="true" />
      <div className="veil" />
    </div>
  )
}

/* ─────────────────────────── countdown ─────────────────────────── */

function Countdown({ title, at, url }: { title: string; at: string; url: string }) {
  const target = useMemo(() => new Date(at).getTime(), [at])
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!at || Number.isNaN(target)) return null
  if (now === null) return null
  const left = Math.max(0, target - now)
  const d = Math.floor(left / 86400000)
  const h = Math.floor((left % 86400000) / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const body = (
    <div className="teaser">
      <span className="tt">{title}</span>
      <div className="clock">
        {([[d, 'Days'], [h, 'Hrs'], [m, 'Min'], [s, 'Sec']] as const).map(([n, l]) => (
          <div key={l}><span className="n">{pad(n as number)}</span><span className="l">{l}</span></div>
        ))}
      </div>
    </div>
  )
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{body}</a> : body
}

/* ──────────────────────────── join form ──────────────────────────── */

const SMS_CONSENT =
  'By entering your number you agree to receive recurring marketing texts from Cincodevinci at the number provided, including messages sent by autodialer. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help.'

function Join({ lede, smsOn, smsLede }: { lede: string; smsOn: boolean; smsLede: string }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState<'email' | 'phone' | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [err, setErr] = useState<Record<string, string>>({})

  const submit = async (kind: 'email' | 'phone', value: string) => {
    if (!value.trim()) return
    setBusy(kind); setErr((e) => ({ ...e, [kind]: '' }))
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, value, consentText: kind === 'phone' ? SMS_CONSENT : 'Opted in on the site for release and drop news.' }),
      })
      const j = await r.json()
      if (!r.ok) { setErr((e) => ({ ...e, [kind]: j.error || 'That did not go through' })); return }
      setDone((d) => ({ ...d, [kind]: j.message || 'You are on the list' }))
    } catch {
      setErr((e) => ({ ...e, [kind]: 'Network problem — try again' }))
    } finally { setBusy(null) }
  }

  return (
    <>
      <p className="lede">{lede}</p>

      {done.email ? (
        <div className="joindone">{done.email}</div>
      ) : (
        <div className="joinrow">
          <input
            type="email" inputMode="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit('email', email) }}
            placeholder="Email" aria-label="Email address"
          />
          <button type="button" disabled={busy === 'email'} onClick={() => submit('email', email)}>
            {busy === 'email' ? '…' : 'Join →'}
          </button>
        </div>
      )}
      {err.email && <div className="joinerr">{err.email}</div>}

      {smsOn && (
        <>
          {done.phone ? (
            <div className="joindone">{done.phone}</div>
          ) : (
            <div className="joinrow">
              <input
                type="tel" inputMode="tel" autoComplete="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit('phone', phone) }}
                placeholder="Phone" aria-label="Phone number"
              />
              <button type="button" disabled={busy === 'phone'} onClick={() => submit('phone', phone)}>
                {busy === 'phone' ? '…' : 'Text me →'}
              </button>
            </div>
          )}
          {err.phone && <div className="joinerr">{err.phone}</div>}
          <p className="joinnote">{smsLede} {SMS_CONSENT}</p>
        </>
      )}
    </>
  )
}

/* ─────────────────────────────── site ─────────────────────────────── */

export default function Site({ data, flags }: { data: Collections; flags: Flags }) {
  const { settings, policies } = data
  const links = data.links.filter((l) => l.show && l.url)
  const releases = data.releases.filter((r) => r.show)
  const videos = data.videos.filter((v) => v.show)
  const shows = data.shows.filter((s) => s.show)
  const products = data.products.filter((p) => p.show)

  const [current, setCurrent] = useState<Release | undefined>(releases[0])
  const [expanded, setExpanded] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [openPol, setOpenPol] = useState<string | null>(null)
  const [panel, setPanel] = useState<{ kind: 'pdp'; p: Product } | { kind: 'bag' } | null>(null)
  const [vis, setVis] = useState(false)
  const [bag, setBag] = useState<BagLine[]>([])
  const [checkoutMsg, setCheckoutMsg] = useState('')

  useEffect(() => { try { setBag(JSON.parse(read('cdv.bag') || '[]')) } catch {} }, [])
  useEffect(() => { write('cdv.bag', JSON.stringify(bag)) }, [bag])

  useEffect(() => {
    const on = () => setStuck(window.scrollY > 40)
    window.addEventListener('scroll', on, { passive: true }); on()
    return () => window.removeEventListener('scroll', on)
  }, [])

  const close = useCallback(() => {
    setVis(false)
    setTimeout(() => { setPanel(null); setCheckoutMsg('') }, 300)
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    if (!panel) return
    document.body.style.overflow = 'hidden'
    const id = requestAnimationFrame(() => setVis(true))
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', esc)
    return () => { cancelAnimationFrame(id); document.removeEventListener('keydown', esc) }
  }, [panel, close])

  const byId = (id: string) => links.find((l) => l.id === id)?.url || ''
  const appleUrl = (r?: Release) => (r?.appleId ? `https://music.apple.com/us/album/${r.appleId}` : byId('apple'))
  const primary = (r?: Release) => r?.url || byId('spotify') || appleUrl(r) || byId('youtube')

  const nBag = bag.reduce((a, b) => a + b.q, 0)
  const subtotal = bag.reduce((a, l) => a + l.p * l.q, 0)

  const addBag = (p: Product, size: string) => {
    const k = `${p.id}|${size}`
    setBag((b) => {
      const hit = b.find((l) => l.k === k)
      if (hit) return b.map((l) => (l.k === k ? { ...l, q: Math.min(9, l.q + 1) } : l))
      return [...b, { k, id: p.id, n: p.name, s: size, q: 1, p: p.price, img: p.img }]
    })
  }

  const checkout = async () => {
    if (!flags.stripe) { setCheckoutMsg('Checkout opens as soon as the Stripe account is connected.'); return }
    setCheckoutMsg('…')
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bag.map((l) => ({ id: l.id, size: l.s, qty: l.q })) }),
      })
      const j = await r.json()
      if (j?.url) { location.href = j.url; return }
      setCheckoutMsg(j?.error || 'Could not start checkout.')
    } catch { setCheckoutMsg('Could not start checkout.') }
  }

  const doors = [
    releases.length && { href: '#listen', label: 'Listen' },
    videos.length && { href: '#watch', label: 'Watch' },
    products.length && { href: '#shop', label: 'Shop' },
    shows.length && { href: '#shows', label: 'Shows' },
    { href: '#more', label: 'More' },
  ].filter(Boolean) as { href: string; label: string }[]

  const shown = expanded ? releases : releases.slice(0, 5)

  return (
    <>
      <Background />
      <SignupGate name={settings.name} lede={settings.joinLede} />

      <div className={'topbar' + (stuck ? ' stuck' : '')}>
        <span className="cap">{settings.name}</span>
        {products.length > 0 && (
          <button className="cap d" type="button" onClick={() => setPanel({ kind: 'bag' })}>
            Bag ({nBag})
          </button>
        )}
      </div>

      <div className="hero">
        <div className="hmid">
          <div className="hinner">
            <button
              className="art" aria-label="Open latest release"
              style={{ backgroundImage: `url('${settings.featured.art}')` }}
              onClick={() => window.open(settings.featured.url || primary(releases[0]), '_blank', 'noopener')}
            />
            <div className="hcap">
              <span className="ttl">{settings.featured.title}</span>
              <span className="sub">{settings.featured.sub}</span>
            </div>
            <a className="hcta" href={settings.featured.url || primary(releases[0])} target="_blank" rel="noopener noreferrer">
              Play
            </a>
            {settings.teaser.on && (
              <Countdown title={settings.teaser.title} at={settings.teaser.at} url={settings.teaser.url} />
            )}
          </div>
        </div>
        <div className="doors">
          {doors.map((d) => <a key={d.href} className="door" href={d.href}>{d.label}</a>)}
        </div>
      </div>

      <main>
        {releases.length > 0 && (
          <section className="sec" id="listen">
            <div className="wrap">
              <div className="sechead"><span className="cap">Listen</span><span className="cap f">{releases.length} releases</span></div>
              <div className="nowline">
                {current?.art && <img className="nowart" src={current.art} alt={`${current.title} artwork`} width={400} height={400} />}
                <div className="nowmeta">
                  <div className="t">{current?.title}</div>
                  <div className="s">{current?.kind} · {current?.year}</div>
                  <div className="outs">
                    {byId('spotify') && <a className="out key" href={byId('spotify')} target="_blank" rel="noopener noreferrer">Play on Spotify</a>}
                    {(byId('apple') || current?.appleId) && <a className="out" href={appleUrl(current)} target="_blank" rel="noopener noreferrer">Apple Music</a>}
                    {byId('youtube') && <a className="out" href={byId('youtube')} target="_blank" rel="noopener noreferrer">YouTube</a>}
                  </div>
                </div>
              </div>
              <div>
                {shown.map((r) => (
                  <button
                    key={r.id} type="button" className="rel"
                    aria-current={r.id === current?.id ? 'true' : 'false'}
                    onClick={() => { setCurrent(r); document.getElementById('listen')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                  >
                    <img className="rc" src={r.art} alt="" loading="lazy" decoding="async" width={60} height={60} />
                    <span className="rn">{r.title}</span>
                    <span className="ry">{r.year}</span>
                  </button>
                ))}
              </div>
              {releases.length > 5 && (
                <button className="showall" type="button" onClick={() => setExpanded((x) => !x)}>
                  {expanded ? 'Show less' : `All ${releases.length} releases`}
                </button>
              )}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="sec" id="watch">
            <div className="wrap">
              <div className="sechead"><span className="cap">Watch</span><span className="cap f">{videos.length} videos</span></div>
              <div className="vids">
                {videos.slice(0, 6).map((v) => (
                  <a key={v.id} className="vid" href={v.url} target="_blank" rel="noopener noreferrer">
                    <div className="vt"><img src={v.thumb} alt="" loading="lazy" decoding="async" width={480} height={270} /></div>
                    <span className="vn">{v.title}</span>
                    <span className="vd">{v.date}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section className="sec" id="shop">
            <div className="wrap">
              <div className="sechead"><span className="cap">Shop</span><span className="cap f">{products.length} pieces</span></div>
              <div className="shelf">
                {products.map((p) => (
                  <button key={p.id} type="button" className="item" onClick={() => setPanel({ kind: 'pdp', p })}>
                    <img className="ph" src={p.img} alt={p.name} loading="lazy" decoding="async" width={600} height={750} />
                    <div className="line"><span className="nm">{p.name}</span><span className="pr">{money(p.price)}</span></div>
                  </button>
                ))}
              </div>
              {policies.length > 0 && (
                <div className="policies">
                  {policies.map((x) => (
                    <div key={x.id} className={'pol' + (openPol === x.id ? ' open' : '')}>
                      <button type="button" onClick={() => setOpenPol((o) => (o === x.id ? null : x.id))}>
                        <span className="ph2">{x.title}</span><span className="pm">+</span>
                      </button>
                      <div className="body">{x.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {shows.length > 0 && (
          <section className="sec" id="shows">
            <div className="wrap">
              <div className="sechead"><span className="cap">Shows</span><span className="cap f">{shows.length} dates</span></div>
              {shows.map((s) => (
                <div key={s.id} className={'sh' + (s.soldOut ? ' gone' : '')}>
                  <span className="dd">{s.date}</span>
                  <span className="vv">{s.venue}<span className="cc">{s.city}</span></span>
                  <a className="tk" href={s.url || '#'} target="_blank" rel="noopener noreferrer">
                    {s.soldOut ? 'Sold out' : 'Tickets'}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="sec" id="more">
          <div className="wrap">
            <div className="sechead"><span className="cap">List</span></div>
            <Join lede={settings.joinLede} smsOn={settings.smsEnabled} smsLede={settings.smsLede} />
            {links.length > 0 && (
              <>
                <div className="sechead" style={{ marginTop: 56 }}><span className="cap">Elsewhere</span></div>
                <div className="elsew">
                  {links.map((l) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" title={l.label} aria-label={l.label}>
                      <Glyph id={l.id} />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <footer><span className="cap f">{settings.footer}</span></footer>
      </main>

      <div className={'panel' + (panel ? ' on' : '') + (vis ? ' vis' : '')} role="dialog" aria-modal="true">
        <div className="phead">
          <button className="cap d" type="button" onClick={close}>← Back</button>
          <span className="cap d">{panel?.kind === 'pdp' ? panel.p.name : panel?.kind === 'bag' ? 'Bag' : ''}</span>
        </div>
        <div className="pscroll">
          {panel?.kind === 'pdp' && <Pdp p={panel.p} fine={settings.shipFine} onAdd={(s) => { addBag(panel.p, s); setPanel({ kind: 'bag' }) }} />}
          {panel?.kind === 'bag' && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              {!bag.length ? <div className="hollow">Bag empty</div> : (
                <>
                  {bag.map((l) => (
                    <div key={l.k} className="bagline">
                      <img className="th" src={l.img} alt="" loading="lazy" decoding="async" width={108} height={136} />
                      <div className="bd">
                        <span className="bn">{l.n}</span>
                        <span className="bs">{l.s} · Qty {l.q}</span>
                        <button className="rmv" type="button" onClick={() => setBag((b) => b.filter((x) => x.k !== l.k))}>Remove</button>
                      </div>
                      <span className="bp">{money(l.p * l.q)}</span>
                    </div>
                  ))}
                  <div className="sum"><span>Total</span><span>{money(subtotal)}</span></div>
                  <button className="buy" type="button" onClick={checkout}>Checkout</button>
                  {checkoutMsg && <div className="msg">{checkoutMsg}</div>}
                  <div className="fine">Secure checkout · Cards, Apple Pay, Google Pay</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Pdp({ p, fine, onAdd }: { p: Product; fine: string; onAdd: (size: string) => void }) {
  const [size, setSize] = useState<string | null>(p.sizes.length === 1 ? p.sizes[0] : null)
  return (
    <div className="pdp">
      <div className="big" style={{ backgroundImage: `url('${p.img}')` }} />
      <div>
        <h2>{p.name}</h2>
        <div className="prc">{money(p.price)}</div>
        <p className="ds">{p.desc}</p>
      </div>
      {p.sizes.length > 0 && (
        <div>
          <span className="cap f">Size</span>
          <div className="szrow">
            {p.sizes.map((s) => (
              <button
                key={s} type="button" className="sz" aria-pressed={size === s}
                disabled={p.soldOut.includes(s)} onClick={() => setSize(s)}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
      <button className="buy" type="button" disabled={!size} onClick={() => size && onAdd(size)}>
        {size ? 'Add to bag' : 'Select a size'}
      </button>
      <div className="fine">{fine}</div>
    </div>
  )
}
