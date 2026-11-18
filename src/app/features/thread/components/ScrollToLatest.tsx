'use client'

import { useEffect } from 'react'

/** 「ここから新着」の線と、時系列の終わりの id */
export const TIMELINE_NEW_ID = 'timeline-new'
export const TIMELINE_END_ID = 'timeline-end'

/**
 * スレッドを開いたら、まだ見ていないところ（なければいちばん下）へ移る。何も描かない。
 * 引用のリンク（#quote-…）で開いたときは、そちらを優先して動かさない
 */
export const ScrollToLatest = () => {
  useEffect(() => {
    if (window.location.hash) return
    const marker = document.getElementById(TIMELINE_NEW_ID)
    if (marker) {
      marker.scrollIntoView({ block: 'start' })
      return
    }
    document.getElementById(TIMELINE_END_ID)?.scrollIntoView({ block: 'end' })
  }, [])
  return null
}
