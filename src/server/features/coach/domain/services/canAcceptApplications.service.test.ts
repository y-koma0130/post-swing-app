import { describe, expect, it } from 'vitest'
import { priceYenSchema } from '../values/PriceYen'
import { canAcceptApplications } from './canAcceptApplications.service'

const plan = (active: boolean) => ({
  kind: 'single' as const,
  name: '1レッスン',
  price: priceYenSchema.parse(4980),
  description: '',
  active,
})

const ready = { suspended: false, chargesEnabled: true, plans: [plan(false), plan(true)] }

describe('canAcceptApplications', () => {
  it('決済を受けられ、受付中のプランがあり、止められていなければ受けられる', () => {
    expect(canAcceptApplications(ready)).toBe(true)
  })

  it('決済の準備ができていなければ受けられない', () => {
    expect(canAcceptApplications({ ...ready, chargesEnabled: false })).toBe(false)
  })

  it('受付中のプランがなければ受けられない', () => {
    expect(canAcceptApplications({ ...ready, plans: [plan(false)] })).toBe(false)
  })

  it('管理者が受付を止めていたら受けられない', () => {
    expect(canAcceptApplications({ ...ready, suspended: true })).toBe(false)
  })
})
