import { z } from 'zod'
import { videoAngleSchema } from './VideoAngle'

/**
 * 生徒の提出（1回に動画1〜2本とメモ）。コーチは提出ごとに1回添削を返す
 */
export const submissionSchema = z.object({
  id: z.string().min(1),
  submittedAt: z.coerce.date(),
  note: z.string().max(1000),
  videos: z.array(z.object({ id: z.string().min(1), angle: videoAngleSchema })).min(1),
  /** コーチが添削を返したか */
  replied: z.boolean(),
})

export type Submission = z.infer<typeof submissionSchema>

/** 提出やチャットに使う前の動画（下書き）。上げた人とスレッドを確かめてからひも付ける */
/** まだ提出にもチャットにも使われていない動画か */
export const isUnusedDraft = (video: Pick<DraftVideo, 'submissionId' | 'chatMessageId'>): boolean =>
  video.submissionId === null && video.chatMessageId === null

export type DraftVideo = Readonly<{
  id: string
  threadId: string
  uploaderUserId: string
  /** すでに提出に使われていれば、その提出 */
  submissionId: string | null
  /** すでにチャットに添えられていれば、そのメッセージ */
  chatMessageId: string | null
  angle: z.infer<typeof videoAngleSchema>
}>
