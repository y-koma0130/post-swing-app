import { describe, expect, it } from 'vitest'
import { blurCheckPassed, clampBox, faceToBlurBox } from './blurBoxes'
import { fitContain, studentLabel, wrapText } from './shareLayout'

describe('studentLabel', () => {
  const profile = { ageRange: '40s' as const, averageScore: 98 }

  it('出してよいと選んだ項目だけを並べる（名前は出さない）', () => {
    expect(studentLabel(profile, { showAgeRange: true, showScore: true })).toBe(
      '40代・平均スコア98'
    )
    expect(studentLabel(profile, { showAgeRange: false, showScore: true })).toBe('平均スコア98')
    expect(studentLabel(profile, { showAgeRange: false, showScore: false })).toBeNull()
  })

  it('書いていない項目は出さない。18歳未満の年代は出さない', () => {
    expect(
      studentLabel({ ageRange: null, averageScore: null }, { showAgeRange: true, showScore: true })
    ).toBeNull()
    expect(
      studentLabel(
        { ageRange: 'under_18', averageScore: null },
        { showAgeRange: true, showScore: true }
      )
    ).toBeNull()
  })
})

describe('fitContain', () => {
  it('縦長の画像を横長の枠に、縦横比を保って真ん中に置く', () => {
    expect(
      fitContain({ width: 720, height: 1280 }, { x: 0, y: 0, width: 1080, height: 960 })
    ).toEqual({ x: 270, y: 0, width: 540, height: 960 })
  })
})

describe('wrapText', () => {
  const measure = (value: string) => value.length * 10

  it('幅に合わせて1文字ずつ折り返し、改行はそのまま', () => {
    expect(wrapText('あいうえおかきく\nけこ', 50, 5, measure)).toEqual([
      'あいうえお',
      'かきく',
      'けこ',
    ])
  })

  it('行が多すぎたら、最後の行を「…」で切る', () => {
    expect(wrapText('あいうえおかきくけこさしすせそ', 50, 2, measure)).toEqual([
      'あいうえお',
      'かきくけ…',
    ])
  })
})

describe('ぼかしの枠', () => {
  it('見つけた顔を、上下左右に20%広げた 0〜1 の枠にする', () => {
    const box = faceToBlurBox(
      { originX: 100, originY: 100, width: 100, height: 100 },
      { width: 1000, height: 1000 }
    )
    expect(box.x).toBeCloseTo(0.08)
    expect(box.y).toBeCloseTo(0.08)
    expect(box.width).toBeCloseTo(0.14)
    expect(box.height).toBeCloseTo(0.14)
  })

  it('画像の端の顔は、はみ出さない', () => {
    const box = faceToBlurBox(
      { originX: 950, originY: 0, width: 50, height: 50 },
      { width: 1000, height: 1000 }
    )
    expect(box.x + box.width).toBeLessThanOrEqual(1)
    expect(box.y).toBe(0)
  })

  it('枠を画像の中に収め、小さすぎる枠は最小の大きさにする', () => {
    expect(clampBox({ x: 0.95, y: -0.1, width: 0.2, height: 0.001 })).toEqual({
      x: 0.8,
      y: 0,
      width: 0.2,
      height: 0.03,
    })
  })
})

describe('blurCheckPassed', () => {
  const box = { x: 0.1, y: 0.1, width: 0.1, height: 0.1 }

  it('顔をぼかす生徒は、どの画像にも枠か「顔は写っていません」の確認が要る', () => {
    expect(
      blurCheckPassed(
        [
          { boxes: [box], noFace: false },
          { boxes: [], noFace: true },
        ],
        true
      )
    ).toBe(true)
    expect(
      blurCheckPassed(
        [
          { boxes: [box], noFace: false },
          { boxes: [], noFace: false },
        ],
        true
      )
    ).toBe(false)
  })

  it('顔を出してよい生徒なら、枠がなくても書き出せる', () => {
    expect(blurCheckPassed([{ boxes: [], noFace: false }], false)).toBe(true)
  })
})
