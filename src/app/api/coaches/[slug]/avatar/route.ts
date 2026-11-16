import { handleAvatarGet } from '@/server/features/coach/presentation/avatarRoutes'

type Context = { params: Promise<{ slug: string }> }

export const GET = async (_request: Request, { params }: Context) =>
  handleAvatarGet((await params).slug)
