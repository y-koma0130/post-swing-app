import { describe, expect, it } from 'vitest'
import { renderEmailHtml } from './renderEmailHtml'

const appUrl = 'https://swingpost.app'

describe('renderEmailHtml', () => {
  it('ロゴ・件名・本文・フッターを入れる', () => {
    const html = renderEmailHtml({ subject: '申し込みがありました', text: '本文です。', appUrl })
    expect(html).toContain(`${appUrl}/brand/swingpost-logo-email.png`)
    expect(html).toContain('申し込みがありました')
    expect(html).toContain('本文です。')
    expect(html).toContain('swingpost.app</a>')
  })

  it('サービスの URL だけの行はボタンにし、文中の URL はリンクにする', () => {
    const html = renderEmailHtml({
      subject: 's',
      text: `見てください。\n\n${appUrl}/coach/threads/1\n\n詳しくは https://example.com を。`,
      appUrl,
    })
    expect(html).toContain(`href="${appUrl}/coach/threads/1"`)
    expect(html).toContain('SwingPost で開く')
    expect(html).toContain('<a href="https://example.com"')
  })

  it('空行で段落を分け、行の区切りは改行にする', () => {
    const html = renderEmailHtml({ subject: 's', text: '1行目\n2行目\n\n次の段落', appUrl })
    expect(html).toContain('1行目<br>2行目</p>')
    expect(html).toContain('>次の段落</p>')
  })

  it('名前などに入った HTML の記号はそのまま文字として出す', () => {
    const html = renderEmailHtml({ subject: '<b>件名</b>', text: '<script>x</script>さん', appUrl })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;さん')
    expect(html).toContain('&lt;b&gt;件名&lt;/b&gt;')
  })

  it('コードを渡すと大きく見せる', () => {
    const html = renderEmailHtml({ subject: 's', text: 't', appUrl, code: '123456' })
    expect(html).toContain('123456</div>')
  })
})
