import { describe, expect, it } from 'vitest'
import { isUniqueViolation } from './isUniqueViolation'

describe('isUniqueViolation', () => {
  it('一意制約のエラーなら true', () => {
    const error = new Error(
      'D1_ERROR: UNIQUE constraint failed: coach_profile.slug: SQLITE_CONSTRAINT'
    )
    expect(isUniqueViolation(error, 'coach_profile.slug')).toBe(true)
  })

  it('包まれたエラーの cause もたどる', () => {
    const cause = new Error('UNIQUE constraint failed: coach_profile.slug')
    expect(isUniqueViolation(new Error('Failed query', { cause }), 'coach_profile.slug')).toBe(true)
  })

  it('別の列やほかのエラーなら false', () => {
    expect(
      isUniqueViolation(new Error('UNIQUE constraint failed: user.email'), 'coach_profile.slug')
    ).toBe(false)
    expect(isUniqueViolation(new Error('network'), 'coach_profile.slug')).toBe(false)
    expect(isUniqueViolation('oops', 'coach_profile.slug')).toBe(false)
  })
})
