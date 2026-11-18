import { handleReplySubmit } from '@/server/features/thread/presentation/replyRoutes'

type Context = { params: Promise<{ threadId: string; submissionId: string }> }

export const POST = async (request: Request, { params }: Context) => {
  const { threadId, submissionId } = await params
  return handleReplySubmit(request, threadId, submissionId)
}
