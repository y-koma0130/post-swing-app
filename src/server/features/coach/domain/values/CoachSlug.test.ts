import { describe, expect, it } from 'vitest'
import { coachSlugSchema } from './CoachSlug'

const valid = (value: string) => coachSlugSchema.safeParse(value).success

describe('coachSlugSchema', () => {
  it('3〜30文字なら受け付ける', () => {
    expect(valid('abc')).toBe(true)
    expect(valid('a'.repeat(30))).toBe(true)
  })

  it('2文字以下・31文字以上は受け付けない', () => {
    expect(valid('ab')).toBe(false)
    expect(valid('a'.repeat(31))).toBe(false)
  })

  it('英小文字・数字・ハイフンだけ。大文字・アンダースコア・空白は受け付けない', () => {
    expect(valid('yamada-golf-01')).toBe(true)
    expect(valid('Yamada')).toBe(false)
    expect(valid('yamada_golf')).toBe(false)
    expect(valid('yamada golf')).toBe(false)
  })
})
