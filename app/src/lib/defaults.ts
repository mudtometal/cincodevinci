import type { Collections } from './types'

export const PLATFORMS = [
  { id: 'spotify', label: 'Spotify' },
  { id: 'apple', label: 'Apple Music' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'soundcloud', label: 'SoundCloud' },
  { id: 'audiomack', label: 'Audiomack' },
  { id: 'x', label: 'X' },
] as const

export const APPLE_ARTIST_ID = '1515145489'
export const YOUTUBE_HANDLE = 'cincodevinci'

export const defaults: Collections = {
  settings: {
    name: 'Cincodevinci',
    featured: {
      title: 'Beautiful Vices',
      sub: 'Out now',
      art: '/img/bv.jpg',
      url: 'https://open.spotify.com/artist/75A3EIpp4ryC1ZUqJyNQ8U',
    },
    joinLede: 'New music, videos and drops before they go public. Nothing else.',
    smsEnabled: false,
    smsLede: 'Texts for drops and shows only. Reply STOP to quit.',
    teaser: { on: false, title: '', at: '', url: '' },
    footer: '© 2026 Cincodevinci',
    contactEmail: 'hello@cincodevinci.com',
    shipFine: 'Free US shipping over $100 · 30-day returns · Ships in 2 business days',
  },
  links: [
    { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com/artist/75A3EIpp4ryC1ZUqJyNQ8U', show: true },
    { id: 'apple', label: 'Apple Music', url: 'https://music.apple.com/us/artist/cincodevinci/1515145489', show: true },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@cincodevinci', show: true },
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/cincodevinci/', show: true },
    { id: 'tiktok', label: 'TikTok', url: '', show: false },
    { id: 'soundcloud', label: 'SoundCloud', url: '', show: false },
    { id: 'audiomack', label: 'Audiomack', url: '', show: false },
    { id: 'x', label: 'X', url: '', show: false },
  ],
  releases: [
    { id: 'r-bv', title: 'Beautiful Vices', year: '2026', kind: 'Album', art: '/img/bv.jpg', show: true, source: 'manual' },
    { id: 'r-tofl', title: 'TOFL', year: '2026', kind: 'Single', art: '/img/c0.jpg', appleId: '6782479189', show: true, source: 'manual' },
    { id: 'r-hn2', title: 'Helluva Night Pt2', year: '2026', kind: 'Single', art: '/img/c1.jpg', appleId: '1893888585', show: true, source: 'manual' },
    { id: 'r-1more', title: '1 More', year: '2026', kind: 'Single', art: '/img/c2.jpg', appleId: '1869714396', show: true, source: 'manual' },
    { id: 'r-lias', title: 'Lying If I Said', year: '2025', kind: 'Single', art: '/img/c3.jpg', appleId: '1803761063', show: true, source: 'manual' },
    { id: 'r-tb', title: 'Talm Bout', year: '2025', kind: 'Single', art: '/img/c4.jpg', appleId: '1798152804', show: true, source: 'manual' },
    { id: 'r-ns', title: 'Norfolk State', year: '2025', kind: 'Single', art: '/img/c5.jpg', appleId: '1789123600', show: true, source: 'manual' },
    { id: 'r-pl', title: 'Pretty Liar', year: '2024', kind: 'Single', art: '/img/c6.jpg', appleId: '1736878950', show: true, source: 'manual' },
    { id: 'r-sml', title: 'Show Me Love', year: '2022', kind: 'Single', art: '/img/c7.jpg', appleId: '1604831495', show: true, source: 'manual' },
    { id: 'r-ch', title: 'Chanely', year: '2021', kind: 'Single', art: '/img/c8.jpg', appleId: '1597365815', show: true, source: 'manual' },
    { id: 'r-moet', title: 'Moet', year: '2021', kind: 'Single', art: '/img/c9.jpg', appleId: '1591708795', show: true, source: 'manual' },
    { id: 'r-ldp', title: 'Love Drugs and Paradise', year: '2020', kind: 'EP', art: '/img/c10.jpg', appleId: '1515147798', show: true, source: 'manual' },
  ],
  videos: [],
  shows: [
    { id: 's-1', date: '14 Nov', venue: 'Archer Music Hall', city: 'Allentown, PA', url: 'https://archermusichall.com/', soldOut: false, show: true },
    { id: 's-2', date: '06 Dec', venue: 'Elevation 27', city: 'Virginia Beach, VA', url: 'https://elevation27.com/', soldOut: true, show: true },
  ],
  products: [
    {
      id: 'bv-tee', name: 'Beautiful Vices Tee', price: 45, img: '/img/m1.jpg', show: true,
      desc: 'Heavyweight cotton tee with the full Beautiful Vices artwork printed across the front. Boxy cut with dropped shoulders — if you want a regular fit, take one size down. Printed and shipped from the US.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], soldOut: ['XXL'],
    },
    {
      id: 'cdv-crew', name: 'Cincodevinci Crewneck', price: 75, img: '/img/m2.jpg', show: true,
      desc: 'Garment-dyed heavyweight crewneck in bone. Chest lockup only, nothing on the back. Relaxed through the body with ribbed cuffs and hem. Runs true to size.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], soldOut: [],
    },
    {
      id: 'bv-print', name: 'Beautiful Vices Print', price: 35, img: '/img/m3.jpg', show: true,
      desc: '18 × 24 inch giclée print of the album artwork on heavy uncoated stock. Open edition, unframed, shipped rolled in a tube.',
      sizes: ['18×24'], soldOut: [],
    },
  ],
  policies: [
    { id: 'p-ship', title: 'Shipping', body: "Orders ship from the US within 2 business days. Standard domestic delivery is 3–5 business days and runs $6 flat, free on orders over $100. International shipping is calculated at checkout — duties and import fees are the customer's responsibility." },
    { id: 'p-ret', title: 'Returns', body: 'Unworn items can be returned within 30 days of delivery for a full refund. Start a return by replying to your order confirmation email. Prints and anything marked final sale cannot be returned. Return shipping is on the customer unless the item arrived damaged or wrong.' },
    { id: 'p-size', title: 'Sizing', body: "Tees run boxy with a dropped shoulder — size down for a regular fit. Crewnecks run true to size. Measurements for each size are listed on the product page. If you're between sizes, size up on the crewneck." },
    { id: 'p-contact', title: 'Contact', body: 'Order questions: hello@cincodevinci.com. Expect a reply within 2 business days. For press, booking or sync, use the same address with the subject line marked.' },
  ],
}
