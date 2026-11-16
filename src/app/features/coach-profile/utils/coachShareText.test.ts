import { describe, expect, it } from 'vitest'
import { coachShareDescription, coachShareTitle } from './coachShareText'

const coach = { name: '山田 太郎', title: 'PGA ティーチングプロ', bio: '' }

describe('coachShareTitle', () => {
  it('コーチの名前を入れる', () => {
    expect(coachShareTitle(coach)).toBe('山田 太郎 のスイング添削')
  })
})

describe('coachShareDescription', () => {
  it('紹介文があれば、改行をまとめて使う', () => {
    expect(coachShareDescription({ ...coach, bio: '初心者から\n\nシングルまで' })).toBe(
      '初心者から シングルまで'
    )
  })

  it('長い紹介文は90文字で切る', () => {
    const text = coachShareDescription({ ...coach, bio: 'あ'.repeat(200) })
    expect([...text]).toHaveLength(90)
    expect(text.endsWith('…')).toBe(true)
  })

  it('紹介文がなければ、肩書きと決まり文句', () => {
    expect(coachShareDescription(coach)).toMatch(/^PGA ティーチングプロ。スイング動画を送ると/)
  })

  it('どちらもなければ決まり文句だけ', () => {
    expect(coachShareDescription({ ...coach, title: '' })).toMatch(/^スイング動画を送ると/)
  })
})
