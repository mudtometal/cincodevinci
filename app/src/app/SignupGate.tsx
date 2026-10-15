'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const KEY = 'cdv.gate'
const DELAY = 1800 // let the artwork land before asking for anything

const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const write = (v: string) => { try { localStorage.setItem(KEY, v) } catch {} }

export default function SignupGate({ name, lede }: { name: string; lede: string }) {
  const [mounted, setMounted] = useState(false)
  const [vis, setVis] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)

  /* Never shown to someone who already joined or already said no. */
  useEffect(() => {
    if (read()) return
    const t = setTimeout(() => {
      setMounted(true)
      requestAnimationFrame(() => setVis(true))
      setTimeout(() => input.current?.focus({ preventScroll: true }), 380)
    }, DELAY)
    return () => clearTimeout(t)
  }, [])

  const shut = useCallback((why: string) => {
    write(why)
    setVis(false)
    setTimeout(() => setMounted(false), 340)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') shut('dismissed') }
    document.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc) }
  }, [mounted, shut])

  const join = async () => {
    const v = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr('That email looks wrong'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'email', value: v, consentText: 'Opted in from the welcome popup for release and drop news.' }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'That did not go through'); return }
      setDone(j.message || 'You are on the list')
      write('joined')
      setTimeout(() => shut('joined'), 1700)
    } catch {
      setErr('Network problem — try again')
    } finally { setBusy(false) }
  }

  if (!mounted) return null

  return (
    <div
      className={'gate on' + (vis ? ' vis' : '')}
      role="dialog" aria-modal="true" aria-label="Join the mailing list"
      onClick={(e) => { if (e.target === e.currentTarget) shut('dismissed') }}
    >
      <div className="gatecard">
        <button className="gatex" type="button" aria-label="Close" onClick={() => shut('dismissed')}>×</button>
        <span className="gm">{name}</span>
        <h3>First on the drops</h3>
        <p className="gl">{lede}</p>

        {done ? (
          <div className="gateok">{done}</div>
        ) : (
          <div className="joinrow">
            <input
              ref={input} type="email" inputMode="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') join() }}
              placeholder="Email" aria-label="Email address"
            />
            <button type="button" disabled={busy} onClick={join}>{busy ? '…' : 'Join →'}</button>
          </div>
        )}
        {err && <div className="gateerr">{err}</div>}

        <button className="gateskip" type="button" onClick={() => shut(done ? 'joined' : 'dismissed')}>
          {done ? 'Close' : 'No thanks'}
        </button>
      </div>
    </div>
  )
}
