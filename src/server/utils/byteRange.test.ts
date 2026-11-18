import { describe, expect, it } from 'vitest'
import { toByteRange } from './byteRange'

describe('toByteRange', () => {
  it('先頭から（bytes=0-15）', () => {
    expect(toByteRange({ offset: 0, length: 16 }, 1000)).toEqual({ start: 0, end: 15 })
  })

  it('値なしの suffix が付いていても、offset と length で計算する', () => {
    expect(toByteRange({ offset: 0, length: 16, suffix: undefined }, 1000)).toEqual({
      start: 0,
      end: 15,
    })
  })

  it('途中から最後まで（bytes=500-）', () => {
    expect(toByteRange({ offset: 500 }, 1000)).toEqual({ start: 500, end: 999 })
  })

  it('最後の n バイト（bytes=-100）', () => {
    expect(toByteRange({ suffix: 100 }, 1000)).toEqual({ start: 900, end: 999 })
  })

  it('大きさを超える要求は末尾で止める', () => {
    expect(toByteRange({ offset: 900, length: 500 }, 1000)).toEqual({ start: 900, end: 999 })
  })
})
