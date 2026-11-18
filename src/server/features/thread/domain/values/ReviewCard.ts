import { z } from 'zod'
import { annotationSchema } from './Annotation'
import { keyPositionSchema } from './KeyPosition'

/**
 * 添削の画像（キャプチャ画像＋線＋短い一言）。1回の添削に何枚か入れ、全体の説明とドリルを添える
 *
 * ドメインルール:
 * - 一言は書かなくてもよい（説明は添削全体に書く）。200文字まで
 * - 線は50本まで
 */
export const reviewCardSchema = z.object({
  position: keyPositionSchema,
  timeSec: z.number().min(0),
  annotations: z.array(annotationSchema).max(50, '線は50本までです'),
  comment: z.string().trim().max(200, '画像の一言は200文字までです'),
})

export type ReviewCard = z.infer<typeof reviewCardSchema>
