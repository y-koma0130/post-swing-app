'use client'

import { useEffect, useState } from 'react'

/**
 * Stripe など、ほかのサイトへ移るフォームのための「移動中」。
 * 送信してからページが切り替わるまで数秒かかることがあるので、そのあいだボタンを押せないままにする。
 * エラーが返ってきた（state が変わった）ときと、ブラウザの「戻る」でこのページに戻ったときは元に戻す
 */
export const useLeavingPage = <State>(state: State) => {
  const [leaving, setLeaving] = useState(false)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    setLeaving(false)
  }

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return { leaving, markLeaving: () => setLeaving(true) }
}
