'use client'

import { useRef, useState } from 'react'

export function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="f">
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function Text({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function Area({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="sw">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="lb">{label}</span>
    </label>
  )
}

/** Picks an image, shrinks it in the browser, uploads it, hands back a URL. */
export function Thumb({ src, onChange, wide, onError }: {
  src: string; onChange: (url: string) => void; wide?: boolean; onError: (m: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File) => {
    setBusy(true)
    try {
      const url = await shrink(file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime: 'image/jpeg', data: url }),
      })
      const j = await res.json()
      if (!res.ok) { onError(j.error || 'Upload failed'); return }
      onChange(j.url)
    } catch {
      onError('Could not read that picture')
    } finally { setBusy(false) }
  }

  return (
    <>
      <div
        className={'thumb' + (wide ? ' wide' : '')}
        style={src ? { backgroundImage: `url('${src}')` } : undefined}
        onClick={() => ref.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') ref.current?.click() }}
      >
        {!src && <span>{busy ? '…' : 'Add photo'}</span>}
        {src && busy && <span style={{ background: '#000', padding: '4px 8px', borderRadius: 6 }}>…</span>}
      </div>
      <input
        ref={ref} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }}
      />
    </>
  )
}

function shrink(file: File, max = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('read'))
    fr.onload = () => {
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        const ctx = c.getContext('2d')
        if (!ctx) return reject(new Error('canvas'))
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.src = String(fr.result)
    }
    fr.readAsDataURL(file)
  })
}
