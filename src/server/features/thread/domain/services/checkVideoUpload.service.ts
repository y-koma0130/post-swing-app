import { err, ok, type Result } from '@/server/utils/result'
import { VIDEO_RULES } from '../rules'
import { type VideoAngle, videoAngleSchema } from '../values/VideoAngle'

export type VideoUploadBlocker = 'unsupported_type' | 'too_large' | 'too_long' | 'invalid_angle'

export type AcceptedVideoUpload = Readonly<{
  angle: VideoAngle
  /** 範囲外の値は記録しない */
  frameRate: number | null
  /** 測れなかったときは null */
  durationSec: number | null
}>

export type CheckVideoUpload = (
  input: Readonly<{
    contentType: string
    sizeBytes: number
    angle: string
    /** 生徒のブラウザが測った長さ（秒）。測れなければ null */
    durationSec: number | null
    frameRate: number | null
  }>
) => Result<AcceptedVideoUpload, VideoUploadBlocker>

const isAllowedContentType = (contentType: string): boolean =>
  VIDEO_RULES.allowedContentTypes.some((allowed) => allowed === contentType)

const acceptFrameRate = (frameRate: number | null): number | null =>
  frameRate !== null &&
  Number.isFinite(frameRate) &&
  frameRate >= VIDEO_RULES.minFrameRate &&
  frameRate <= VIDEO_RULES.maxFrameRate
    ? frameRate
    : null

/**
 * 上げられた動画1本を受け付けられるか（スレッドがいま提出を受け付けるかは checkSubmission で確かめる）
 *
 * ドメインルール:
 * - 動画の形式は mp4・mov・webm、大きさは100MBまで
 * - 長さは60秒まで（生徒のブラウザが測った値。測れなかったときは止めない）
 * - 角度（正面・後方・その他）を選ぶ
 * - フレームレートは、ありえない値なら記録しない（送信は止めない）
 */
export const checkVideoUpload: CheckVideoUpload = (input) => {
  if (!isAllowedContentType(input.contentType)) return err('unsupported_type')
  if (input.sizeBytes <= 0 || input.sizeBytes > VIDEO_RULES.maxBytes) return err('too_large')
  const duration =
    input.durationSec !== null && Number.isFinite(input.durationSec) && input.durationSec > 0
      ? input.durationSec
      : null
  if (duration !== null && duration > VIDEO_RULES.maxDurationSeconds) return err('too_long')
  const angle = videoAngleSchema.safeParse(input.angle)
  if (!angle.success) return err('invalid_angle')
  return ok({
    angle: angle.data,
    frameRate: acceptFrameRate(input.frameRate),
    durationSec: duration,
  })
}
