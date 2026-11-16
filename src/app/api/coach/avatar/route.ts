import {
  handleAvatarDelete,
  handleAvatarUpload,
} from '@/server/features/coach/presentation/avatarRoutes'

export const POST = (request: Request) => handleAvatarUpload(request)

export const DELETE = () => handleAvatarDelete()
