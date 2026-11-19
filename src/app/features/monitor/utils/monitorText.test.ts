import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { monitorApplyUrl, monitorCodeState, monitorPriceText } from './monitorText'

const now = new Date('2026-11-19T03:00:00Z')
const code = { active: true, usedCount: 1, maxUses: 3, expiresOn: null }

describe('monitorCodeState', () => {
  it('止めている・期限切れ・満員・募集中の順に決める', () => {
    expect(monitorCodeState(code, now)).toBe('open')
    expect(monitorCodeState({ ...code, usedCount: 3 }, now)).toBe('full')
    expect(monitorCodeState({ ...code, expiresOn: localDateSchema.parse('2026-11-18') }, now)).toBe(
      'expired'
    )
    expect(monitorCodeState({ ...code, active: false, usedCount: 3 }, now)).toBe('stopped')
  })
})

describe('monitorPriceText・monitorApplyUrl', () => {
  it('0円は「無料」', () => {
    expect(monitorPriceText(0)).toBe('無料')
    expect(monitorPriceText(1980)).toBe('1,980円')
  })

  it('コードを入れた状態で開く URL', () => {
    expect(monitorApplyUrl('https://swingpost.app', 'yamada', 'ABCD2345')).toBe(
      'https://swingpost.app/c/yamada/apply?code=ABCD2345'
    )
  })
})
