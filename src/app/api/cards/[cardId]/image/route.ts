import { handleCardImage } from '@/server/features/thread/presentation/replyRoutes'

type Context = { params: Promise<{ cardId: string }> }

export const GET = async (request: Request, { params }: Context) =>
  handleCardImage(request, (await params).cardId)
