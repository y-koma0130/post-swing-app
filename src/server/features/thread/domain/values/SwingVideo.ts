import { z } from 'zod'

/**
 * 生徒が送ったスイング動画
 */
export const swingVideoSchema = z.object({
  id: z.string().min(1),
  uploadedAt: z.coerce.date(),
  note: z.string().max(1000),
  /** コーチが添削カードを返したか */
  replied: z.boolean(),
})

export type SwingVideo = z.infer<typeof swingVideoSchema>
