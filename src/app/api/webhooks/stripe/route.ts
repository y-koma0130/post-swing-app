import { handleStripeWebhook } from '@/server/features/purchase/presentation/stripeWebhook'

export const POST = (request: Request) => handleStripeWebhook(request)
