import 'server-only'
import { env } from 'cloudflare:workers'
import Stripe from 'stripe'

let stripe: Stripe | null = null

/** Workers では Node の http が使えないので、fetch で通信する */
export const getStripe = (): Stripe => {
  stripe ??= new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  })
  return stripe
}

export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()
