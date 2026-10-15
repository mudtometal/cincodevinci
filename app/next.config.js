/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: '/bg.mp4', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ]
  },
}
