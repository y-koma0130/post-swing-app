import { z } from 'zod'

/**
 * 申し込みを断った理由
 * - expired: 期限までにコーチが返事をしなかった（システムが付ける）
 */
export const declineReasonSchema = z.enum([
  'out_of_scope',
  'unavailable',
  'video_unclear',
  'other',
  'expired',
])
export type DeclineReason = z.infer<typeof declineReasonSchema>

/** コーチが選べる理由（期限切れはシステムだけが付ける） */
export const coachDeclineReasonSchema = declineReasonSchema.exclude(['expired'])
export type CoachDeclineReason = z.infer<typeof coachDeclineReasonSchema>

/** 断るときのひとこと（任意） */
export const declineMessageSchema = z.string().trim().max(200, '200文字までです')
