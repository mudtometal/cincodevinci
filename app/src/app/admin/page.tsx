import type { Metadata } from 'next'
import AdminClient from './AdminClient'
import './admin.css'

export const metadata: Metadata = { title: 'Admin · Cincodevinci', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return <AdminClient />
}
