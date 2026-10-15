import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCollection, setCollection } from '@/lib/store'
import { fetchReleases, fetchVideos, merge } from '@/lib/sync'
import { requireAdmin } from '@/lib/guard'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny

  let what = 'both'
  let appleId: string | undefined
  let youtube: string | undefined
  try {
    const b = await req.json()
    what = b.what || 'both'
    appleId = b.appleId || undefined
    youtube = b.youtube || undefined
  } catch {}

  const out: Record<string, string> = {}

  if (what === 'releases' || what === 'both') {
    try {
      const incoming = await fetchReleases(appleId)
      const existing = await getCollection('releases')
      const merged = merge(existing, incoming)
      await setCollection('releases', merged)
      out.releases = `${incoming.length} found`
    } catch (e) {
      out.releases = `Could not reach Apple — ${(e as Error).message}`
    }
  }

  if (what === 'videos' || what === 'both') {
    try {
      const incoming = await fetchVideos(youtube)
      const existing = await getCollection('videos')
      const merged = merge(existing, incoming)
      await setCollection('videos', merged)
      out.videos = `${incoming.length} found`
    } catch (e) {
      out.videos = `Could not reach YouTube — ${(e as Error).message}`
    }
  }

  revalidatePath('/')
  return NextResponse.json({ ok: true, result: out })
}
