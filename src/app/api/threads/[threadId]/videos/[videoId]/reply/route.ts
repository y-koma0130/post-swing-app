import { handleReplySubmit } from '@/server/features/thread/presentation/replyRoutes'

type Context = { params: Promise<{ threadId: string; videoId: string }> }

export const POST = async (request: Request, { params }: Context) => {
  const { threadId, videoId } = await params
  return handleReplySubmit(request, threadId, videoId)
}
