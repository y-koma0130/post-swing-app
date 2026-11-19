import { z } from 'zod'

/** 撮り直しをお願いする理由 */
export const retakeReasonSchema = z.enum(['framing', 'angle', 'quality', 'other'])
export type RetakeReason = z.infer<typeof retakeReasonSchema>

/** お願いが終わったわけ（撮り直しが届いた・生徒が今は撮れないと返した・コーチが添削を返した） */
export const retakeCloseReasonSchema = z.enum(['resent', 'declined', 'replied'])
export type RetakeCloseReason = z.infer<typeof retakeCloseReasonSchema>

/** お願いに添えるひとこと（任意） */
export const retakeMessageSchema = z.string().trim().max(200, '200文字までです')

/**
 * コーチから生徒への撮り直しのお願い
 *
 * ドメインルール:
 * - 提出回数には数えない。元の動画はそのまま使える
 * - 開いているお願い（closedAt が null）は、1つのスレッドに1つまで
 */
export const retakeRequestSchema = z.object({
  id: z.string().min(1),
  submissionId: z.string().min(1),
  reason: retakeReasonSchema,
  message: z.string(),
  requestedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable(),
  closeReason: retakeCloseReasonSchema.nullable(),
})

export type RetakeRequest = z.infer<typeof retakeRequestSchema>

export const isOpenRetake = (request: Pick<RetakeRequest, 'closedAt'>): boolean =>
  request.closedAt === null
