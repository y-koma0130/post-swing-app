import 'server-only'
import { findThreadDetailById } from '../infrastructure/query-services/findThreadDetailById'
import { listThreadSummariesByCoach } from '../infrastructure/query-services/listThreadSummariesByCoach'

/**
 * Server Component から呼ぶ読み取り口
 */
export const getThreadDetail = (threadId: string) => findThreadDetailById(threadId)

export const listThreadSummaries = (coachSlug: string) => listThreadSummariesByCoach(coachSlug)
