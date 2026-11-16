'use client'

import { useEffect } from 'react'
import { markThreadReadAction } from '@/server/features/thread/presentation/actions'

type Props = {
  threadId: string
  /** いちばん新しい出来事の時刻（変わったら、もう一度「開いた」と記録する） */
  latestAt: number
}

/** スレッドを開いたことを記録する（未読の札を消し、通知をまとめるのに使う）。何も描かない */
export const MarkThreadRead = ({ threadId, latestAt }: Props) => {
  useEffect(() => {
    // latestAt が変わったとき（新しいやりとりを表示したとき）にも記録し直す
    void latestAt
    void markThreadReadAction(threadId)
  }, [threadId, latestAt])
  return null
}
