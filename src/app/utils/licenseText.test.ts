import { describe, expect, it } from 'vitest'
import { licenseLabels } from './licenseText'

describe('licenseLabels', () => {
  it('選んだ資格を選択肢の順に並べ、その他を最後に足す', () => {
    expect(licenseLabels(['jipga', 'pga_tournament'], ' 公認スポーツ指導者 ')).toEqual([
      'PGA トーナメントプロ',
      'JIPGA ライセンス',
      '公認スポーツ指導者',
    ])
  })

  it('何もなければ空', () => {
    expect(licenseLabels([], '  ')).toEqual([])
  })
})
