import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { Campaign } from '../values/Campaign'
import { checkGrant } from './checkGrant.service'

const today = localDateSchema.parse('2026-11-20')

const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: 'k1',
  code: 'early_adopter_2026',
  name: '先行募集',
  feeRate: 0,
  durationDays: 90,
  anchor: 'first_approval',
  maxGrants: 10,
  active: true,
  ...overrides,
})

const check = (input: Partial<Parameters<typeof checkGrant>[0]> = {}) =>
  checkGrant({
    campaign: campaign(),
    alreadyGranted: false,
    hasApprovedBefore: false,
    today,
    ...input,
  })

describe('checkGrant', () => {
  it('初めての承認から数えるキャンペーンは、始まらないまま付く', () => {
    expect(check()).toEqual({ ok: true, value: { period: null } })
  })

  it('すでに承認したことがあるコーチなら、付けた日から始める', () => {
    expect(check({ hasApprovedBefore: true })).toEqual({
      ok: true,
      value: { period: { startDate: '2026-11-20', endDate: '2027-02-17' } },
    })
  })

  it('付けた日から数えるキャンペーンは、すぐ始める', () => {
    const result = check({ campaign: campaign({ anchor: 'granted', durationDays: 30 }) })
    expect(result).toEqual({
      ok: true,
      value: { period: { startDate: '2026-11-20', endDate: '2026-12-19' } },
    })
  })

  it('終わったキャンペーンは付けられない', () => {
    expect(check({ campaign: campaign({ active: false }) })).toEqual({
      ok: false,
      error: 'campaign_inactive',
    })
  })

  it('同じキャンペーンは1回だけ', () => {
    expect(check({ alreadyGranted: true })).toEqual({ ok: false, error: 'already_granted' })
  })
})
