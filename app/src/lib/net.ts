/**
 * Plain fetch in production. In a sandboxed dev container an outbound proxy may
 * be required, and Node's fetch ignores HTTPS_PROXY — honour it when present so
 * the sync jobs are testable locally. No effect on a normal deployment.
 */
let dispatcher: unknown
let tried = false

async function proxyDispatcher() {
  if (tried) return dispatcher
  tried = true
  const url = process.env.HTTPS_PROXY || process.env.https_proxy
  if (!url) return undefined
  try {
    const { ProxyAgent } = await import('undici')
    dispatcher = new ProxyAgent(url)
  } catch { dispatcher = undefined }
  return dispatcher
}

export async function get(url: string, init: RequestInit = {}): Promise<Response> {
  const d = await proxyDispatcher()
  const opts: RequestInit & { dispatcher?: unknown } = {
    ...init,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; cincodevinci-site/1.0)', ...(init.headers || {}) },
  }
  if (d) opts.dispatcher = d
  return fetch(url, opts as RequestInit)
}
