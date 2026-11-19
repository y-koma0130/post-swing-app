import { handleDrillVideoDownload } from '@/server/features/drill/presentation/drillVideoRoutes'

type Context = { params: Promise<{ videoId: string }> }

export const GET = async (request: Request, { params }: Context) =>
  handleDrillVideoDownload(request, (await params).videoId)
