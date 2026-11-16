import { err, ok, type Result } from '@/server/utils/result'
import { VIDEO_RULES } from '../rules'
import { type Thread, threadThemeSchema } from '../values/Thread'

export type VideoUploadBlocker =
  | 'unsupported_type'
  | 'too_large'
  | 'note_too_long'
  | 'theme_required'

export type AcceptedVideoUpload = Readonly<{
  note: string
  /** 最初の動画のときだけ。スレッドのテーマになる */
  theme: string | null
  /** 範囲外の値は記録しない */
  frameRate: number | null
}>

export type CheckVideoUpload = (
  input: Readonly<{
    thread: Pick<Thread, 'videos'>
    contentType: string
    sizeBytes: number
    note: string
    theme: string
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
 * 送られてきた動画ファイルと、添えられた内容を受け付けられるか
 * （スレッドがいま動画を受け付ける状態かは checkVideoSubmission で確かめる）
 *
 * ドメインルール:
 * - 動画の形式は mp4・mov・webm、大きさは100MBまで
 * - メモは1000文字まで
 * - 最初の動画ではテーマ（直したいところ）を書く。2本目以降はテーマを変えない
 * - 生徒のブラウザが測ったフレームレートは、ありえない値なら記録しない（送信は止めない）
 */
export const checkVideoUpload: CheckVideoUpload = (input) => {
  if (!isAllowedContentType(input.contentType)) return err('unsupported_type')
  if (input.sizeBytes <= 0 || input.sizeBytes > VIDEO_RULES.maxBytes) return err('too_large')
  if (input.note.length > VIDEO_RULES.maxNoteLength) return err('note_too_long')
  const isFirst = input.thread.videos.length === 0
  const theme = isFirst ? threadThemeSchema.safeParse(input.theme) : null
  if (theme && !theme.success) return err('theme_required')
  return ok({
    note: input.note.trim(),
    theme: theme?.success ? theme.data : null,
    frameRate: acceptFrameRate(input.frameRate),
  })
}
