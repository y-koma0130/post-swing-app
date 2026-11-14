import 'server-only'
import { findCoachProfileBySlug } from '../infrastructure/query-services/findCoachProfileBySlug'

/**
 * Server Component から呼ぶ読み取り口
 */
export const getCoachProfile = (slug: string) => findCoachProfileBySlug(slug)

/**
 * ログイン中のコーチのスラッグ
 *
 * MOC: ログインがないので固定。段階1でセッションから取得する
 */
export const getCurrentCoachSlug = async (): Promise<string> => 'sample-pro'
