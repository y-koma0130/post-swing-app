import { describe, expect, it } from 'vitest'
import { calcMaintenanceDates } from './calcMaintenanceDates.service'

describe('calcMaintenanceDates', () => {
  it('期限まで2〜3日のもの・届いて3〜4日返信のない動画を知らせ、90日より前に終わったものの動画を消す', () => {
    expect(calcMaintenanceDates(new Date('2026-11-16T19:00:00Z'))).toEqual({
      remindExpiringFrom: new Date('2026-11-18T19:00:00Z'),
      remindExpiringTo: new Date('2026-11-19T19:00:00Z'),
      overdueVideoFrom: new Date('2026-11-12T19:00:00Z'),
      overdueVideoTo: new Date('2026-11-13T19:00:00Z'),
      deleteVideosClosedBefore: new Date('2026-08-18T19:00:00Z'),
    })
  })
})
