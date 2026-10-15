import Stripe from 'stripe'

export const stripeReady = () => !!process.env.STRIPE_SECRET_KEY

let client: Stripe | null = null
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not connected yet')
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  return client
}
