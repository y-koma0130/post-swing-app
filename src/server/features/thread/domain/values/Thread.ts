import { z } from 'zod'
import { coachSlugSchema } from '@/server/features/coach/domain/values/CoachSlug'
import { THREAD_RULES } from '../rules'
import { chatMessageSchema } from './ChatMessage'
import { swingVideoSchema } from './SwingVideo'
import { threadIdSchema } from './ThreadId'
import { threadStatusSchema } from './ThreadStatus'

/**
 * スレッド（1つのテーマを「送る→直す→撮り直す」で見る単位）
 */
export const threadSchema = z.object({
  id: threadIdSchema,
  coachSlug: coachSlugSchema,
  studentName: z.string().min(1).max(50),
  theme: z.string().min(1).max(100),
  status: threadStatusSchema,
  startedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  videos: z
    .array(swingVideoSchema)
    .max(THREAD_RULES.maxVideosPerThread, `動画は${THREAD_RULES.maxVideosPerThread}本までです`),
  messages: z.array(chatMessageSchema),
})

export type Thread = z.infer<typeof threadSchema>
