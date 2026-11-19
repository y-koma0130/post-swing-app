import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANS } from '../rules'
import { coachProfileSchema, coachSchema } from './Coach'

const profile = {
  slug: 'yamada',
  name: '山田 太郎',
  title: '',
  bio: '',
  instagram: '',
  licenses: [],
  licenseOther: '',
  monthlyCapacity: 20,
}

describe('coachProfileSchema', () => {
  it('名前の前後の空白を取る', () => {
    expect(coachProfileSchema.parse({ ...profile, name: '  山田  ' }).name).toBe('山田')
  })

  it('名前が空白だけなら受け付けない', () => {
    expect(coachProfileSchema.safeParse({ ...profile, name: '   ' }).success).toBe(false)
  })

  it('名前は50文字まで', () => {
    expect(coachProfileSchema.safeParse({ ...profile, name: 'あ'.repeat(50) }).success).toBe(true)
    expect(coachProfileSchema.safeParse({ ...profile, name: 'あ'.repeat(51) }).success).toBe(false)
  })

  it('月の受付枠は1〜100', () => {
    const valid = (monthlyCapacity: number) =>
      coachProfileSchema.safeParse({ ...profile, monthlyCapacity }).success
    expect(valid(0)).toBe(false)
    expect(valid(1)).toBe(true)
    expect(valid(100)).toBe(true)
    expect(valid(101)).toBe(false)
    expect(valid(1.5)).toBe(false)
  })
})

describe('coachSchema', () => {
  const coach = {
    ...profile,
    userId: 'coach-1',
    stripeAccountId: null,
    chargesEnabled: false,
    suspended: false,
    plans: [...DEFAULT_PLANS],
  }

  it('種類の違うプランなら並べられる', () => {
    expect(coachSchema.safeParse(coach).success).toBe(true)
  })

  it('同じ種類のプランは1つまで', () => {
    const [trial] = DEFAULT_PLANS
    expect(coachSchema.safeParse({ ...coach, plans: [trial, trial] }).success).toBe(false)
  })
})
