import { describe, expect, it } from 'vitest'
import { cardQuoteLabel, cardTitle, cardVideoLabelOf, videoQuoteLabel } from './threadText'

const front = { id: 'v1', angle: 'front' as const, retake: false }
const back = { id: 'v2', angle: 'back' as const, retake: false }
const other = { id: 'v3', angle: 'other' as const, retake: false }
const retake = { id: 'v4', angle: 'front' as const, retake: true }

describe('videoQuoteLabel', () => {
  it('角度のある動画は「1回目・正面の動画」', () => {
    expect(videoQuoteLabel(0, front, [front, back])).toBe('1回目・正面の動画')
  })

  it('「その他」1本だけなら「1回目・動画」（「動画の動画」にしない）', () => {
    expect(videoQuoteLabel(0, other, [other])).toBe('1回目・動画')
  })

  it('撮り直しの動画は「撮り直し・正面の動画」', () => {
    expect(videoQuoteLabel(1, retake, [other, retake])).toBe('2回目・撮り直し・正面の動画')
  })
})

describe('cardQuoteLabel', () => {
  it('「1回目の添削・トップ」', () => {
    expect(cardQuoteLabel(0, 'top')).toBe('1回目の添削・トップ')
  })
})

describe('cardVideoLabelOf・cardTitle', () => {
  it('動画が2本以上なら、カードの見出しに角度を付ける', () => {
    const labelOf = cardVideoLabelOf([front, back])
    expect(labelOf('v2')).toBe('後方')
    expect(cardTitle({ videoId: 'v2', position: 'impact' }, 0, labelOf)).toBe('1. 後方・インパクト')
  })

  it('動画が1本なら角度を付けない', () => {
    const labelOf = cardVideoLabelOf([front])
    expect(labelOf('v1')).toBeNull()
    expect(cardTitle({ videoId: 'v1', position: 'top' }, 1, labelOf)).toBe('2. トップ')
  })

  it('知らない動画なら角度を付けない', () => {
    expect(cardVideoLabelOf([front, back])('v9')).toBeNull()
  })
})
