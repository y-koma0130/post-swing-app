import { describe, expect, it } from 'vitest'
import { uniqueCoaches } from './uniqueCoaches'

describe('uniqueCoaches', () => {
  it('同じコーチは1回だけ、最初に出てきた順で', () => {
    expect(
      uniqueCoaches([
        { coachName: '山田', coachSlug: 'yamada', coachAvatarUrl: null },
        { coachName: '佐藤', coachSlug: 'sato', coachAvatarUrl: '/a.jpg' },
        { coachName: '山田', coachSlug: 'yamada', coachAvatarUrl: null },
      ])
    ).toEqual([
      { name: '山田', slug: 'yamada', avatarUrl: null },
      { name: '佐藤', slug: 'sato', avatarUrl: '/a.jpg' },
    ])
  })
})
