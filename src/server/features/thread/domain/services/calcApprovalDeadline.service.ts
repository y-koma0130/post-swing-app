import { APPLICATION_RULES } from '../rules'

const HOUR_MS = 60 * 60 * 1000

export type CalcApprovalDeadline = (requestedAt: Date) => Date

/**
 * コーチが申し込みを受けるか決める期限
 *
 * ドメインルール:
 * - 承認を待ち始めてから48時間
 */
export const calcApprovalDeadline: CalcApprovalDeadline = (requestedAt) =>
  new Date(requestedAt.getTime() + APPLICATION_RULES.approvalHours * HOUR_MS)
