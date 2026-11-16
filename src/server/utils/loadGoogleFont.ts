import 'server-only'

/**
 * Google Fonts から、指定した文字だけを含むフォントを取る（OG 画像の日本語用）
 *
 * 日本語のフォントは数 MB あるので、text= で使う文字だけに絞る。
 * User-Agent を付けないと TrueType で返る（OG 画像の描画は woff2 を読めない）。取れなければ null
 */
export const loadGoogleFont = async (
  family: string,
  weight: number,
  text: string
): Promise<ArrayBuffer | null> => {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
  try {
    const css = await (await fetch(cssUrl)).text()
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
    if (!fontUrl) return null
    const response = await fetch(fontUrl)
    return response.ok ? await response.arrayBuffer() : null
  } catch {
    return null
  }
}
