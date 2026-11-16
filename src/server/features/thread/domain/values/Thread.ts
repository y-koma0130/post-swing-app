import { z } from 'zod'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { chatMessageSchema } from './ChatMessage'
import { swingVideoSchema } from './SwingVideo'
import { threadIdSchema } from './ThreadId'
import { threadStatusSchema } from './ThreadStatus'

/**
 * スレッド（1つのテーマを「送る→直す→撮り直す」で見る単位）
 *
 * ドメインルール:
 * - 期間は開始から30日
 * - 動画はお試し1本、それ以外は3本まで
 * - テーマは最初の動画を送るときに生徒が書く
 */
export const threadSchema = z.object({
  id: threadIdSchema,
  coachUserId: z.string().min(1),
  studentUserId: z.string().min(1),
  planKind: planKindSchema,
  theme: z.string().max(100),
  status: threadStatusSchema,
  startedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable(),
  videos: z.array(swingVideoSchema),
  messages: z.array(chatMessageSchema),
})

export type Thread = z.infer<typeof threadSchema>

/** テーマ（生徒が書く） */
export const threadThemeSchema = z
  .string()
  .trim()
  .min(1, '直したいところを書いてください')
  .max(100, '100文字までです')

/** 支払いが済んだときに作るスレッド（作るのは thread、呼ぶのは purchase） */
export type NewThread = Readonly<{
  id: string
  purchaseId: string
  coachUserId: string
  studentUserId: string
  planKind: Thread['planKind']
  startedAt: Date
  expiresAt: Date
  /** 月額のときの請求。請求ごとにスレッドを1つ作る */
  stripeInvoiceId: string | null
}>
