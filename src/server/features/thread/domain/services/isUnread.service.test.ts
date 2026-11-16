import { describe, expect, it } from 'vitest'
import { isUnread } from './isUnread.service'

const at = (minute: number) => new Date(Date.UTC(2026, 10, 16, 0, minute))

describe('isUnread', () => {
  it('最後に開いたあとに相手の出来事があれば未読', () => {
    expect(isUnread({ latestCounterpartActivityAt: at(10), lastReadAt: at(5) })).toBe(true)
    expect(isUnread({ latestCounterpartActivityAt: at(10), lastReadAt: null })).toBe(true)
  })

  it('開いたあとに何もなければ既読。相手の出来事がなければ未読にしない', () => {
    expect(isUnread({ latestCounterpartActivityAt: at(5), lastReadAt: at(10) })).toBe(false)
    expect(isUnread({ latestCounterpartActivityAt: null, lastReadAt: null })).toBe(false)
  })
})
