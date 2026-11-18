import { handleVideoDownload } from '@/server/features/thread/presentation/videoRoutes'

type Context = { params: Promise<{ videoId: string }> }

export const GET = async (request: Request, { params }: Context) =>
  handleVideoDownload(request, (await params).videoId)
