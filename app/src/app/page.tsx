import { getAll } from '@/lib/store'
import { stripeReady } from '@/lib/stripe'
import { smsReady } from '@/lib/sms'
import Site from './Site'

/* Served from cache and refreshed in the background; admin saves bust it
   immediately, so the page is fast without ever looking stale. */
export const revalidate = 600

export default async function Page() {
  const data = await getAll()
  return (
    <>
      {data.settings.featured.art && (
        <link rel="preload" as="image" href={data.settings.featured.art} fetchPriority="high" />
      )}
      <Site data={data} flags={{ stripe: stripeReady(), sms: smsReady() }} />
    </>
  )
}
