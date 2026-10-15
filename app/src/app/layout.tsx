import type { Metadata, Viewport } from 'next'
import './globals.css'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: 'Cincodevinci',
  description: 'Music, videos, shows and merch from Cincodevinci.',
  openGraph: {
    title: 'Cincodevinci',
    description: 'Music, videos, shows and merch from Cincodevinci.',
    images: ['/img/bv.jpg'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap"
        />
        <style>{`body{font-family:"Archivo",Helvetica,Arial,sans-serif}`}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
