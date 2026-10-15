export type Settings = {
  name: string
  featured: { title: string; sub: string; art: string; url: string }
  joinLede: string
  smsEnabled: boolean
  smsLede: string
  teaser: { on: boolean; title: string; at: string; url: string }
  footer: string
  contactEmail: string
  shipFine: string
}

export type Link = { id: string; label: string; url: string; show: boolean }

export type Release = {
  id: string
  title: string
  year: string
  kind: string
  art: string
  appleId?: string
  url?: string
  show: boolean
  source: 'auto' | 'manual'
}

export type Video = {
  id: string
  title: string
  date: string
  thumb: string
  url: string
  show: boolean
  source: 'auto' | 'manual'
}

export type Show = {
  id: string
  date: string
  venue: string
  city: string
  url: string
  soldOut: boolean
  show: boolean
}

export type Product = {
  id: string
  name: string
  price: number
  img: string
  desc: string
  sizes: string[]
  soldOut: string[]
  show: boolean
  stripePriceId?: string
}

export type Policy = { id: string; title: string; body: string }

export type Collections = {
  settings: Settings
  links: Link[]
  releases: Release[]
  videos: Video[]
  shows: Show[]
  products: Product[]
  policies: Policy[]
}

export type CollectionKey = keyof Collections

export type Subscriber = {
  id: string
  kind: 'email' | 'phone'
  value: string
  confirmed: boolean
  consentText: string
  ip: string
  createdAt: string
  unsubscribedAt?: string | null
}

export type Order = {
  id: string
  sessionId: string
  email: string
  amount: number
  currency: string
  items: { name: string; size: string; qty: number }[]
  status: string
  createdAt: string
}

export type StoredImage = { id: string; mime: string; data: string; createdAt: string }
