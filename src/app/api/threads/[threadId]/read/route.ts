import { handleMarkThreadRead } from '@/server/features/thread/presentation/readRoutes'

type Context = { params: Promise<{ threadId: string }> }

export const POST = async (_request: Request, { params }: Context) =>
  handleMarkThreadRead((await params).threadId)
