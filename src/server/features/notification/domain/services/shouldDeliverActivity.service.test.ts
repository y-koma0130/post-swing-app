import { describe, expect, it } from 'vitest'
import { shouldDeliverActivity } from './shouldDeliverActivity.service'

const at = (minute: number) => new Date(Date.UTC(2026, 10, 16, 0, minute))
const unseen = { submissions: 0, replies: 0, messages: 1 }

describe('shouldDeliverActivity', () => {
  it('まだ見ておらず、あとの出来事もなければ送る', () => {
    expect(
      shouldDeliverActivity({
        occurredAt: at(10),
        facts: { lastReadAt: at(5), latestSenderActivityAt: at(10), unseen },
      })
    ).toBeNull()
    expect(
      shouldDeliverActivity({
        occurredAt: at(10),
        facts: { lastReadAt: null, latestSenderActivityAt: at(10), unseen },
      })
    ).toBeNull()
  })

  it('出来事のあとに開いていたら送らない', () => {
    expect(
      shouldDeliverActivity({
        occurredAt: at(10),
        facts: { lastReadAt: at(11), latestSenderActivityAt: at(10), unseen },
      })
    ).toBe('already_read')
  })

  it('同じ相手からあとにも出来事があれば、あとの通知に任せる', () => {
    expect(
      shouldDeliverActivity({
        occurredAt: at(10),
        facts: { lastReadAt: at(5), latestSenderActivityAt: at(11), unseen },
      })
    ).toBe('superseded')
  })
})
