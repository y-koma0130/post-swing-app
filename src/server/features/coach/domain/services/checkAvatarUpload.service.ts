import { AVATAR_RULES } from '../rules'

export type AvatarBlocker = 'unsupported_type' | 'too_large'

export type CheckAvatarUpload = (
  input: Readonly<{ contentType: string; sizeBytes: number }>
) => AvatarBlocker | null

/**
 * プロフィール画像として受け付けられるか
 *
 * ドメインルール:
 * - JPEG か PNG（SNS のカード画像にも使うため）
 * - 1MB まで（ブラウザで 512px の正方形にしてから送る）
 */
export const checkAvatarUpload: CheckAvatarUpload = ({ contentType, sizeBytes }) => {
  if (!AVATAR_RULES.allowedContentTypes.some((t) => t === contentType)) return 'unsupported_type'
  if (sizeBytes <= 0 || sizeBytes > AVATAR_RULES.maxBytes) return 'too_large'
  return null
}
