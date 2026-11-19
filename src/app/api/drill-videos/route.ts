import { handleDrillVideoUpload } from '@/server/features/drill/presentation/drillVideoRoutes'

export const POST = (request: Request) => handleDrillVideoUpload(request)
