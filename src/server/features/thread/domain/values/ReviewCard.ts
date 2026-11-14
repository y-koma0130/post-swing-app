import { z } from 'zod'
import { annotationSchema } from './Annotation'
import { keyPositionSchema } from './KeyPosition'

/**
 * 添削カード（キャプチャ画像＋線＋理由）
 */
export const reviewCardSchema = z.object({
  id: z.string().min(1),
  position: keyPositionSchema,
  timeSec: z.number().min(0),
  annotations: z.array(annotationSchema),
  comment: z.string().min(1).max(2000),
})

export type ReviewCard = z.infer<typeof reviewCardSchema>
