import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { MONITOR_RULES } from '../rules'
import { monitorCodeTextSchema } from '../values/MonitorCode'
import { checkMonitorCodeUse } from './checkMonitorCodeUse.service'
import { checkMonitorOffer, checkMonitorOfferChange } from './checkMonitorOffer.service'
import { generateMonitorCode } from './generateMonitorCode.service'

const offer = { label: '知人用', priceYen: 0, maxUses: 3, expiresOn: null }

describe('generateMonitorCode', () => {
  it('8文字で、読み間違えやすい文字を使わない', () => {
    const code = generateMonitorCode(new Uint8Array([0, 1, 2, 3, 30, 31, 200, 255, 9]))
    expect(code).toHaveLength(MONITOR_RULES.codeLength)
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
    expect(code).not.toMatch(/[01OIL]/)
  })
})

describe('monitorCodeTextSchema', () => {
  it('前後の空白を除き、小文字は大文字にそろえる', () => {
    expect(monitorCodeTextSchema.parse(' abcd2345 ')).toBe('ABCD2345')
  })

  it('長さが違う・使わない文字を含むコードは読めない', () => {
    expect(monitorCodeTextSchema.safeParse('ABCD234').success).toBe(false)
    expect(monitorCodeTextSchema.safeParse('ABCD2340').success).toBe(false)
  })
})

describe('checkMonitorOffer', () => {
  it('無料、または50円以上で1レッスンより安い価格にできる', () => {
    expect(checkMonitorOffer({ offer, singlePriceYen: 4980 }).ok).toBe(true)
    expect(checkMonitorOffer({ offer: { ...offer, priceYen: 50 }, singlePriceYen: 4980 }).ok).toBe(
      true
    )
    expect(
      checkMonitorOffer({ offer: { ...offer, priceYen: 4979 }, singlePriceYen: 4980 }).ok
    ).toBe(true)
  })

  it('1レッスンの価格以上にはできない', () => {
    expect(
      checkMonitorOffer({ offer: { ...offer, priceYen: 4980 }, singlePriceYen: 4980 })
    ).toEqual({ ok: false, error: 'price_not_discounted' })
  })

  it('1〜49円は Stripe で払えないので選べない', () => {
    expect(checkMonitorOffer({ offer: { ...offer, priceYen: 49 }, singlePriceYen: 4980 })).toEqual({
      ok: false,
      error: 'price_below_minimum',
    })
  })
})

describe('checkMonitorOfferChange', () => {
  it('呼び名・期限・人数は変えられる', () => {
    const next = {
      ...offer,
      label: 'インスタ募集',
      maxUses: 5,
      expiresOn: localDateSchema.parse('2026-12-31'),
    }
    expect(checkMonitorOfferChange({ current: offer, next, usedCount: 2 })).toEqual({
      ok: true,
      value: next,
    })
  })

  it('価格は変えられない（無料から割引にも）', () => {
    expect(
      checkMonitorOfferChange({ current: offer, next: { ...offer, priceYen: 1000 }, usedCount: 0 })
    ).toEqual({ ok: false, error: 'price_locked' })
  })

  it('人数は、申し込んだ数までなら減らせる', () => {
    expect(
      checkMonitorOfferChange({ current: offer, next: { ...offer, maxUses: 2 }, usedCount: 2 }).ok
    ).toBe(true)
    expect(
      checkMonitorOfferChange({ current: offer, next: { ...offer, maxUses: 1 }, usedCount: 2 })
    ).toEqual({ ok: false, error: 'max_uses_below_used' })
  })
})

describe('checkMonitorCodeUse', () => {
  const now = new Date('2026-11-19T14:59:00Z') // 日本時間 11/19 23:59
  const code = { active: true, maxUses: 3, expiresOn: localDateSchema.parse('2026-11-19') }
  const base = { code, usedCount: 2, alreadyMonitor: false, now }

  it('受付中・期限内・空きがあれば使える（期限の日の終わりまで）', () => {
    expect(checkMonitorCodeUse(base)).toEqual({ ok: true, value: null })
  })

  it('止めている・期限を過ぎた・満員のコードは使えない', () => {
    expect(checkMonitorCodeUse({ ...base, code: { ...code, active: false } })).toEqual({
      ok: false,
      error: 'code_stopped',
    })
    expect(checkMonitorCodeUse({ ...base, now: new Date('2026-11-19T15:00:00Z') })).toEqual({
      ok: false,
      error: 'code_expired',
    })
    expect(checkMonitorCodeUse({ ...base, usedCount: 3 })).toEqual({
      ok: false,
      error: 'code_full',
    })
  })

  it('同じコーチのモニターになれるのは1回まで', () => {
    expect(checkMonitorCodeUse({ ...base, alreadyMonitor: true })).toEqual({
      ok: false,
      error: 'already_monitor',
    })
  })
})
