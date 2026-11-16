import { handleDevPurchase } from '@/server/features/purchase/presentation/devPurchase'

/** 開発用：/api/dev/purchase?coach=<slug>&plan=<trial|single|monthly>（本番では 404） */
export const GET = (request: Request) => handleDevPurchase(request)
