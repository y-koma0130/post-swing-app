import { describe, expect, it } from 'vitest'
import { LIST_PAGE_SIZE, parseShownCount, showMoreHref } from './listPaging'

describe('parseShownCount', () => {
  it.each([
    [undefined, LIST_PAGE_SIZE],
    ['abc', LIST_PAGE_SIZE],
    ['3', LIST_PAGE_SIZE],
    ['15.5', LIST_PAGE_SIZE],
    ['20', 20],
    ['99999', 500],
  ])('%s → %i', (raw, expected) => {
    expect(parseShownCount(raw)).toBe(expected)
  })
})

describe('showMoreHref', () => {
  it('同じページで、出す件数を1ページ分増やす', () => {
    expect(showMoreHref('/me', 10)).toBe('/me?finished=20')
  })
})
