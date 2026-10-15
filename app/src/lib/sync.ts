import { get } from './net'
import { APPLE_ARTIST_ID, YOUTUBE_HANDLE } from './defaults'
import type { Release, Video } from './types'

/* ───────── releases: iTunes Lookup API — free, no key, no quota ───────── */

type ITunesItem = {
  wrapperType: string
  collectionType?: string
  collectionId?: number
  collectionName?: string
  releaseDate?: string
  artworkUrl100?: string
  trackCount?: number
  collectionViewUrl?: string
}

export async function fetchReleases(artistId = APPLE_ARTIST_ID): Promise<Release[]> {
  const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200&sort=recent`
  const res = await get(url)
  if (!res.ok) throw new Error(`Apple returned ${res.status}`)
  const json = (await res.json()) as { results?: ITunesItem[] }
  const albums = (json.results || [])
    .filter((r) => r.wrapperType === 'collection' && r.collectionId)
    /* Sort on the full timestamp — two records from the same year must not tie. */
    .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))

  return albums
    .map((a): Release => {
      const year = (a.releaseDate || '').slice(0, 4)
      const tracks = a.trackCount ?? 0
      const kind = tracks <= 2 ? 'Single' : tracks <= 6 ? 'EP' : 'Album'
      return {
        id: `apple-${a.collectionId}`,
        title: (a.collectionName || '').replace(/\s*-\s*(Single|EP)$/i, '').trim(),
        year,
        kind,
        art: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        appleId: String(a.collectionId),
        url: a.collectionViewUrl,
        show: true,
        source: 'auto',
      }
    })
    .filter((r) => r.title)
}

/* ───────── videos: YouTube RSS — free, no key, no quota ───────── */

export async function resolveChannelId(handle = YOUTUBE_HANDLE): Promise<string | null> {
  if (/^UC[\w-]{20,}$/.test(handle)) return handle
  const res = await get(`https://www.youtube.com/@${handle.replace(/^@/, '')}`)
  if (!res.ok) return null
  const html = await res.text()
  const m = html.match(/"channelId":"(UC[\w-]+)"/) || html.match(/channel\/(UC[\w-]+)/)
  return m ? m[1] : null
}

export async function fetchVideos(handleOrId = YOUTUBE_HANDLE): Promise<Video[]> {
  const channelId = await resolveChannelId(handleOrId)
  if (!channelId) throw new Error('Could not find that YouTube channel')
  const res = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
  if (!res.ok) throw new Error(`YouTube returned ${res.status}`)
  return parseYoutubeFeed(await res.text())
}

export function parseYoutubeFeed(xml: string): Video[] {
  const out: Video[] = []
  const entries = xml.split('<entry>').slice(1)
  for (const e of entries) {
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const date = e.match(/<published>([^<]+)<\/published>/)?.[1]
    if (!id || !title) continue
    out.push({
      id: `yt-${id}`,
      title: decodeEntities(title.trim()),
      date: (date || '').slice(0, 10),
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
      show: true,
      source: 'auto',
    })
  }
  return out
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

/**
 * Auto-synced items refresh freely, but anything the client hid or edited by
 * hand must survive a sync. Merge on id, let local edits win.
 */
export function merge<T extends { id: string; show: boolean; source: 'auto' | 'manual' }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map(existing.map((x) => [x.id, x]))
  const manual = existing.filter((x) => x.source === 'manual')
  const merged = incoming.map((inc) => {
    const old = byId.get(inc.id)
    return old ? { ...inc, show: old.show, ...(old.source === 'manual' ? old : {}) } : inc
  })
  const seen = new Set(merged.map((x) => x.id))
  return [...manual.filter((m) => !seen.has(m.id)), ...merged]
}
