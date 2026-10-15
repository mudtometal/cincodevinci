import { getImage } from '@/lib/store'

export const runtime = 'nodejs'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const img = await getImage(id)
  if (!img) return new Response('Not found', { status: 404 })
  const buf = Buffer.from(img.data, 'base64')
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': img.mime,
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${id}"`,
    },
  })
}
