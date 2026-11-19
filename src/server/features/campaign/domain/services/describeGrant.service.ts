import type { LocalDate } from '@/server/utils/localDate'
import type { CoachFeeGrant } from '../values/CoachFeeGrant'

export type GrantState =
  | Readonly<{ kind: 'pending' }>
  | Readonly<{ kind: 'active'; endDate: LocalDate }>
  | Readonly<{ kind: 'scheduled'; startDate: LocalDate }>
  | Readonly<{ kind: 'ended'; endDate: LocalDate }>
  | Readonly<{ kind: 'revoked' }>

export type DescribeGrant = (
  input: Readonly<{ grant: Pick<CoachFeeGrant, 'period' | 'revokedAt'>; today: LocalDate }>
) => GrantState

/** 特典がいまどの状態か（画面の表示用） */
export const describeGrant: DescribeGrant = ({ grant, today }) => {
  if (grant.revokedAt !== null) return { kind: 'revoked' }
  if (grant.period === null) return { kind: 'pending' }
  if (today < grant.period.startDate)
    return { kind: 'scheduled', startDate: grant.period.startDate }
  if (grant.period.endDate < today) return { kind: 'ended', endDate: grant.period.endDate }
  return { kind: 'active', endDate: grant.period.endDate }
}
