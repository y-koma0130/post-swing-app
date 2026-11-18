import { handleLineWebhook } from '@/server/features/notification/presentation/lineWebhook'

export const POST = (request: Request) => handleLineWebhook(request)
