import { useCallback, useEffect, useRef, useState } from 'react'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'

export type CardDraft = {
  localId: string
  /** どの動画（正面・後方など）から作ったか */
  videoId: string
  position: KeyPosition
  timeSec: number
  annotations: Annotation[]
  comment: string
  drillId: string | null
  image: Blob
  imageUrl: string
}

type SendResult = { ok: true } | { ok: false; message: string }

const readMessage = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body
      if (typeof message === 'string') return message
    }
  } catch {
    // JSON でなければ下の文言を出す
  }
  return '送信に失敗しました。もう一度お試しください'
}

/** 作りかけの添削カード。送るまではブラウザの中だけに持つ */
export const useCardDrafts = () => {
  const [drafts, setDrafts] = useState<CardDraft[]>([])
  const urls = useRef(new Set<string>())

  // 画面を離れたら、プレビュー用の画像のメモリを解放する
  useEffect(() => {
    const current = urls.current
    return () => {
      for (const url of current) URL.revokeObjectURL(url)
    }
  }, [])

  const add = useCallback(
    (draft: Omit<CardDraft, 'localId' | 'imageUrl' | 'comment' | 'drillId'>) => {
      const imageUrl = URL.createObjectURL(draft.image)
      urls.current.add(imageUrl)
      setDrafts((prev) => [
        ...prev,
        { ...draft, localId: crypto.randomUUID(), imageUrl, comment: '', drillId: null },
      ])
    },
    []
  )

  const update = useCallback(
    (localId: string, patch: Partial<Pick<CardDraft, 'comment' | 'drillId'>>) => {
      setDrafts((prev) => prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d)))
    },
    []
  )

  const remove = useCallback((localId: string) => {
    setDrafts((prev) => {
      const target = prev.find((d) => d.localId === localId)
      if (target) {
        URL.revokeObjectURL(target.imageUrl)
        urls.current.delete(target.imageUrl)
      }
      return prev.filter((d) => d.localId !== localId)
    })
  }, [])

  const send = useCallback(
    async (threadId: string, submissionId: string): Promise<SendResult> => {
      const form = new FormData()
      form.set(
        'cards',
        JSON.stringify(
          drafts.map(({ videoId, position, timeSec, annotations, comment, drillId }) => ({
            videoId,
            position,
            timeSec,
            annotations,
            comment,
            drillId,
          }))
        )
      )
      drafts.forEach((draft, index) => {
        form.set(`image-${index}`, draft.image, `card-${index}.png`)
      })
      const response = await fetch(`/api/threads/${threadId}/submissions/${submissionId}/reply`, {
        method: 'POST',
        body: form,
      })
      if (!response.ok) {
        return { ok: false, message: await readMessage(response) }
      }
      for (const draft of drafts) URL.revokeObjectURL(draft.imageUrl)
      urls.current.clear()
      setDrafts([])
      return { ok: true }
    },
    [drafts]
  )

  return { drafts, add, update, remove, send }
}
