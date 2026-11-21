/**
 * Instagram の投稿を開くリンク。
 * LINE の中のブラウザで開いていると、リンクを押しても LINE の中で Instagram のウェブ版が開いてしまう
 * （ログインを求められがち）。openExternalBrowser=1 を付けると LINE が外に渡すので、
 * スマホに Instagram のアプリがあれば、OS がアプリで開く。LINE の外では何も起きない
 */
export const instagramOpenUrl = (postUrl: string): string => {
  const url = new URL(postUrl)
  url.searchParams.set('openExternalBrowser', '1')
  return url.toString()
}
