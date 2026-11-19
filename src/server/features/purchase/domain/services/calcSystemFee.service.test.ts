import { describe, expect, it } from 'vitest'
import { calcSystemFee } from './calcSystemFee.service'

describe('calcSystemFee', () => {
  it('価格の5%が200円より安ければ200円', () => {
    expect(calcSystemFee(550)).toBe(200)
    expect(calcSystemFee(3980)).toBe(200)
  })

  it('境目の4,000円はちょうど200円', () => {
    expect(calcSystemFee(4000)).toBe(200)
    expect(calcSystemFee(4020)).toBe(201)
  })

  it('価格の5%が高ければ5%（円未満は切り捨て）', () => {
    expect(calcSystemFee(4980)).toBe(249)
    expect(calcSystemFee(10000)).toBe(500)
  })
})
