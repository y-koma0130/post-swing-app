import { describe, expect, it } from 'vitest'
import { calcMaintenanceDates } from './calcMaintenanceDates.service'

describe('calcMaintenanceDates', () => {
  it('期限まで2〜3日のものを知らせ、60日以内の未添削の提出を調べ、90日より前に終わったものの動画と24時間より前の下書きを消す', () => {
    expect(calcMaintenanceDates(new Date('2026-11-16T19:00:00Z'))).toEqual({
      remindExpiringFrom: new Date('2026-11-18T19:00:00Z'),
      remindExpiringTo: new Date('2026-11-19T19:00:00Z'),
      unrepliedSince: new Date('2026-09-17T19:00:00Z'),
      deleteVideosClosedBefore: new Date('2026-08-18T19:00:00Z'),
      deleteDraftsCreatedBefore: new Date('2026-11-15T19:00:00Z'),
    })
  })
})
