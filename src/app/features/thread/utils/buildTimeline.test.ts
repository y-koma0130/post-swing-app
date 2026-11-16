import { describe, expect, it } from 'vitest'
import { buildTimeline, latestTimelineAt } from './buildTimeline'

const at = (minute: number) => new Date(Date.UTC(2026, 10, 14, 0, minute))

describe('buildTimeline', () => {
  it('提出・添削・チャット・お知らせを時刻順に1本に並べる', () => {
    const items = buildTimeline({
      submissions: [
        { id: 's1', submittedAt: at(0), reply: { sentAt: at(30) } },
        { id: 's2', submittedAt: at(50), reply: null },
      ],
      messages: [
        { id: 'm1', sentAt: at(10) },
        { id: 'm2', sentAt: at(40) },
      ],
      notices: [{ id: 'n1', createdAt: at(50) }],
    })
    expect(items.map((i) => i.key)).toEqual(['s-s1', 'm-m1', 'r-s1', 'm-m2', 's-s2', 'n-n1'])
  })

  it('提出と添削には、何回目かを付ける', () => {
    const items = buildTimeline({
      submissions: [
        { id: 's1', submittedAt: at(0), reply: { sentAt: at(1) } },
        { id: 's2', submittedAt: at(2), reply: null },
      ],
      messages: [],
      notices: [],
    })
    expect(items.map((i) => ('index' in i ? i.index : null))).toEqual([0, 0, 1])
  })
})

describe('latestTimelineAt', () => {
  it('提出・添削・チャットのうち、いちばん新しい時刻', () => {
    expect(
      latestTimelineAt({
        submissions: [{ submittedAt: at(0), reply: { sentAt: at(30) } }],
        messages: [{ sentAt: at(20) }],
      })
    ).toBe(at(30).getTime())
    expect(latestTimelineAt({ submissions: [], messages: [] })).toBe(0)
  })
})
