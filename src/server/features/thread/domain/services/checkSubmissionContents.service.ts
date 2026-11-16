import { err, ok, type Result } from '@/server/utils/result'
import { THREAD_RULES } from '../rules'
import { type DraftVideo, isUnusedDraft, type Submission } from '../values/Submission'
import { type Thread, threadThemeSchema } from '../values/Thread'

export type SubmissionContentsBlocker =
  | 'no_videos'
  | 'too_many_videos'
  | 'invalid_video'
  | 'theme_required'
  | 'note_too_long'

export type AcceptedSubmission = Readonly<{
  videos: Submission['videos']
  note: string
  /** 最初の提出のときだけ。スレッドのテーマになる */
  theme: string | null
}>

export type CheckSubmissionContents = (
  input: Readonly<{
    thread: Pick<Thread, 'submissions'> & { id: string }
    actorUserId: string
    /** 生徒が選んだ動画（上げた順） */
    videoIds: ReadonlyArray<string>
    /** videoIds で見つかった下書き */
    drafts: ReadonlyArray<DraftVideo>
    theme: string
    note: string
  }>
) => Result<AcceptedSubmission, SubmissionContentsBlocker>

/**
 * 提出の中身を受け付けられるか（いま提出できるかは checkSubmission で確かめる）
 *
 * ドメインルール:
 * - 動画は1〜2本
 * - 使えるのは、このスレッドに本人が上げて、まだ提出に使っていない動画だけ
 * - 最初の提出ではテーマ（直したいところ）を書く。2回目以降はテーマを変えない
 * - メモは1000文字まで
 */
export const checkSubmissionContents: CheckSubmissionContents = (input) => {
  const ids = [...new Set(input.videoIds)]
  if (ids.length === 0) return err('no_videos')
  if (ids.length > THREAD_RULES.maxVideosPerSubmission) return err('too_many_videos')
  const videos: Array<Submission['videos'][number]> = []
  for (const id of ids) {
    const draft = input.drafts.find((d) => d.id === id)
    if (
      !draft ||
      draft.threadId !== input.thread.id ||
      draft.uploaderUserId !== input.actorUserId ||
      !isUnusedDraft(draft)
    ) {
      return err('invalid_video')
    }
    videos.push({ id: draft.id, angle: draft.angle })
  }
  const note = input.note.trim()
  if (note.length > THREAD_RULES.maxSubmissionNoteLength) return err('note_too_long')
  const isFirst = input.thread.submissions.length === 0
  const theme = isFirst ? threadThemeSchema.safeParse(input.theme) : null
  if (theme && !theme.success) return err('theme_required')
  return ok({ videos, note, theme: theme?.success ? theme.data : null })
}
