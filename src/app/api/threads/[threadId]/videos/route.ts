import { handleVideoUpload } from '@/server/features/thread/presentation/videoRoutes'

type Context = { params: Promise<{ threadId: string }> }

export const POST = async (request: Request, { params }: Context) =>
  handleVideoUpload(request, (await params).threadId)
