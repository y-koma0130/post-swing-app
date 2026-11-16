import { z } from 'zod'
import { annotationSchema } from './Annotation'
import { keyPositionSchema } from './KeyPosition'

/**
 * 添削カード（キャプチャ画像＋線＋理由）
 *
 * ドメインルール:
 * - 理由は必ず書く（線だけでは伝わらない）
 * - 線は50本まで
 */
export const reviewCardSchema = z.object({
  position: keyPositionSchema,
  timeSec: z.number().min(0),
  annotations: z.array(annotationSchema).max(50, '線は50本までです'),
  comment: z.string().trim().min(1, '理由を書いてください').max(2000, '理由は2000文字までです'),
  drillId: z.string().min(1).nullable(),
})

export type ReviewCard = z.infer<typeof reviewCardSchema>
