import { describe, expect, it } from 'vitest'
import { coachSlugSchema } from '../values/CoachSlug'
import { generateCoachSlug, RANDOM_SLUG_LENGTH } from './generateCoachSlug.service'

describe('generateCoachSlug', () => {
  it('英小文字・数字の8文字で、スラッグの形に合う', () => {
    const slug = generateCoachSlug(new Uint8Array([0, 1, 25, 26, 35, 36, 200, 255]))
    expect(slug).toBe('abz09aud')
    expect(slug).toHaveLength(RANDOM_SLUG_LENGTH)
    expect(coachSlugSchema.safeParse(slug).success).toBe(true)
  })
})
