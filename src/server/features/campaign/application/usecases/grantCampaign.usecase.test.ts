import { describe, expect, it, vi } from 'vitest'
import type { Campaign } from '../../domain/values/Campaign'
import { grantCampaign } from './grantCampaign.usecase'

type Deps = Parameters<typeof grantCampaign>[1]

const campaign: Campaign = {
  id: 'k1',
  code: 'early_adopter_2026',
  name: '先行募集',
  feeRate: 0,
  durationDays: 90,
  anchor: 'first_approval',
  maxGrants: 10,
  active: true,
}

// 日本時間 2026-11-20 08:00
const now = new Date('2026-11-19T23:00:00Z')

const setup = (overrides: Partial<Deps> = {}) => {
  const insertGrantWithinLimit = vi.fn<Deps['insertGrantWithinLimit']>(async () => true)
  const deps: Deps = {
    findCampaignByCode: async (code) => (code === campaign.code ? campaign : null),
    grantExists: async () => false,
    hasCoachBeenPaid: async () => false,
    insertGrantWithinLimit,
    generateId: () => 'g1',
    ...overrides,
  }
  return { deps, insertGrantWithinLimit }
}

const run = (deps: Deps, campaignCode = campaign.code) =>
  grantCampaign({ coachUserId: 'c1', campaignCode, now }, deps)

describe('grantCampaign', () => {
  it('まだ承認したことがないコーチには、始まらないまま付ける', async () => {
    const { deps, insertGrantWithinLimit } = setup()
    expect(await run(deps)).toEqual({ ok: true, value: { grantId: 'g1' } })
    expect(insertGrantWithinLimit).toHaveBeenCalledWith({
      id: 'g1',
      coachUserId: 'c1',
      campaignId: 'k1',
      period: null,
      createdAt: now,
    })
  })

  it('すでに承認したことがあるコーチには、付けた日（日本時間）から始める', async () => {
    const { deps, insertGrantWithinLimit } = setup({ hasCoachBeenPaid: async () => true })
    await run(deps)
    expect(insertGrantWithinLimit.mock.calls[0]?.[0].period).toEqual({
      startDate: '2026-11-20',
      endDate: '2027-02-17',
    })
  })

  it('上限に達していたら付けない', async () => {
    const { deps } = setup({ insertGrantWithinLimit: async () => false })
    expect(await run(deps)).toEqual({ ok: false, error: 'limit_reached' })
  })

  it('同じキャンペーンは1回だけ', async () => {
    const { deps, insertGrantWithinLimit } = setup({ grantExists: async () => true })
    expect(await run(deps)).toEqual({ ok: false, error: 'already_granted' })
    expect(insertGrantWithinLimit).not.toHaveBeenCalled()
  })

  it('ないキャンペーン・終わったキャンペーンは付けられない', async () => {
    expect(await run(setup().deps, 'unknown')).toEqual({ ok: false, error: 'campaign_not_found' })
    const { deps } = setup({ findCampaignByCode: async () => ({ ...campaign, active: false }) })
    expect(await run(deps)).toEqual({ ok: false, error: 'campaign_inactive' })
  })
})
