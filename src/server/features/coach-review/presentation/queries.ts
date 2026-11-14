import 'server-only'
import { findCoachReviewSummary } from '../infrastructure/query-services/findCoachReviewSummary'

/** 受付ページのレビュー（公開情報） */
export const getCoachReviewSummary = (coachSlug: string) => findCoachReviewSummary(coachSlug)
