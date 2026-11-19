/**
 * メールの HTML（ロゴ・本文・ボタン・フッター）。文面はテキストのメールと同じものから作る。
 *
 * - メールソフトは CSS の対応がまちまちなので、表（table）と、要素に直接書いたスタイルだけで組む
 * - 本文の中で1行まるごとサービスの URL の行は、「SwingPost で開く」のボタンにする
 * - ロゴは PNG（SVG は Gmail などで表示されない）
 */

const COLORS = {
  mint: '#3fbf87',
  ink: '#0b3d2c',
  body: '#3a3d3c',
  muted: '#626866',
  surface: '#f6f7f6',
  line: '#e3e6e4',
} as const

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g

/** 文の中の URL をリンクにする（ほかは文字のまま） */
const linkify = (line: string): string => {
  let html = ''
  let last = 0
  for (const match of line.matchAll(URL_PATTERN)) {
    const url = match[0]
    const start = match.index
    html += escapeHtml(line.slice(last, start))
    html += `<a href="${escapeHtml(url)}" style="color:${COLORS.mint};word-break:break-all;">${escapeHtml(url)}</a>`
    last = start + url.length
  }
  return html + escapeHtml(line.slice(last))
}

const button = (url: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;"><tr><td style="border-radius:999px;background:${COLORS.mint};">` +
  `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:15px;font-weight:bold;color:${COLORS.ink};text-decoration:none;border-radius:999px;">SwingPost で開く</a>` +
  '</td></tr></table>' +
  `<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:${COLORS.muted};word-break:break-all;">ボタンが押せないときは、こちらを開いてください：<br>${linkify(url)}</p>`

const paragraph = (lines: string[]): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:${COLORS.body};">${lines.map(linkify).join('<br>')}</p>`

/** ログインコードなど、大きく見せる文字列 */
const codeBlock = (code: string): string =>
  `<div style="margin:8px 0 20px;padding:16px;border-radius:12px;background:${COLORS.surface};text-align:center;font-size:32px;font-weight:bold;letter-spacing:0.3em;color:${COLORS.ink};">${escapeHtml(code)}</div>`

/** テキストの本文を、段落とボタンに分ける（空行で段落、URL だけの行はボタン） */
const renderBody = (text: string, appUrl: string): string => {
  const blocks: string[] = []
  let lines: string[] = []
  const flush = () => {
    if (lines.length > 0) blocks.push(paragraph(lines))
    lines = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') {
      flush()
    } else if (line.startsWith(appUrl) && /^\S+$/.test(line)) {
      flush()
      blocks.push(button(line))
    } else {
      lines.push(raw)
    }
  }
  flush()
  return blocks.join('')
}

export type RenderEmailHtmlInput = {
  subject: string
  text: string
  /** サービスの URL（ロゴの画像とフッターのリンク。本文でこの URL で始まる行はボタンにする） */
  appUrl: string
  /** 大きく見せるコード（ログインコード）。本文の前に出す */
  code?: string | undefined
}

export const renderEmailHtml = ({ subject, text, appUrl, code }: RenderEmailHtmlInput): string =>
  [
    '<!doctype html>',
    '<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:${COLORS.surface};font-family:${FONT};">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.surface};"><tr><td align="center" style="padding:24px 12px;">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">',
    // ロゴ
    `<tr><td style="padding:0 8px 16px;"><a href="${escapeHtml(appUrl)}"><img src="${escapeHtml(appUrl)}/brand/swingpost-logo-email.png" width="140" height="36" alt="SwingPost" style="display:block;border:0;"></a></td></tr>`,
    // 本文のカード
    `<tr><td style="padding:28px 24px 12px;background:#ffffff;border:1px solid ${COLORS.line};border-radius:16px;">`,
    `<h1 style="margin:0 0 20px;font-size:18px;line-height:1.5;color:${COLORS.ink};">${escapeHtml(subject)}</h1>`,
    code ? codeBlock(code) : '',
    renderBody(text, appUrl),
    '</td></tr>',
    // フッター
    `<tr><td style="padding:16px 8px;font-size:12px;line-height:1.7;color:${COLORS.muted};">`,
    'このメールは SwingPost（ゴルフのスイング動画添削サービス）から送信しています。<br>',
    `<a href="${escapeHtml(appUrl)}" style="color:${COLORS.muted};">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</a>`,
    '</td></tr>',
    '</table></td></tr></table></body></html>',
  ].join('')
