/** 増えていく一覧（完了したレッスン・送ったドリルなど）で、はじめに出す件数。「もっと見る」でも同じ数ずつ足す */
export const LIST_PAGE_SIZE = 10

/** 一度に出す件数の上限（URL を書き換えて大きな数を入れられても、読みすぎないように） */
const MAX_SHOWN = 500

/**
 * URL の ?finished=20 から、出す件数を決める。数でない・小さすぎる・大きすぎるときは、はじめの件数か上限にする
 */
export const parseShownCount = (raw: string | undefined): number => {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < LIST_PAGE_SIZE) return LIST_PAGE_SIZE
  return Math.min(n, MAX_SHOWN)
}

/** 「もっと見る」の行き先（同じページで、出す件数を1ページ分増やす） */
export const showMoreHref = (path: string, shown: number): string =>
  `${path}?finished=${Math.min(shown + LIST_PAGE_SIZE, MAX_SHOWN)}`
