import { describe, expect, it } from 'vitest'
import { uniqueCoaches } from './uniqueCoaches'

describe('uniqueCoaches', () => {
  it('同じコーチは1回だけ、最初に出てきた順で', () => {
    expect(
      uniqueCoaches([
        { coachName: '山田', coachSlug: 'yamada' },
        { coachName: '佐藤', coachSlug: 'sato' },
        { coachName: '山田', coachSlug: 'yamada' },
      ])
    ).toEqual([
      { name: '山田', slug: 'yamada' },
      { name: '佐藤', slug: 'sato' },
    ])
  })
})
