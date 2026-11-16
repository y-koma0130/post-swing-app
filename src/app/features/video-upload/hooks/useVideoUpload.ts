import { useCallback, useState } from 'react'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'done' }

type UploadInput = {
  threadId: string
  file: File
  angle: VideoAngle
  /** 送る長さ（秒）。測れなければ null */
  durationSec: number | null
  /** 変換したときに測ったフレームレート。再生画面のコマ送りに使う */
  frameRate: number | null
}

const readVideoId = (responseText: string): string | null => {
  try {
    const body: unknown = JSON.parse(responseText)
    if (typeof body === 'object' && body !== null && 'videoId' in body) {
      const { videoId } = body
      if (typeof videoId === 'string') return videoId
    }
  } catch {
    // JSON でなければ失敗として扱う
  }
  return null
}

const parseMessage = (responseText: string): string => {
  try {
    const body: unknown = JSON.parse(responseText)
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body
      if (typeof message === 'string') return message
    }
  } catch {
    // JSON でなければ下の文言を出す
  }
  return '送信に失敗しました。通信のよい場所でもう一度お試しください'
}

/**
 * 提出に使う動画を1本上げる（下書き）。上げられたら動画の ID を返す。
 * 進み具合を出すため fetch ではなく XMLHttpRequest を使う（本体はそのまま送り、角度などはヘッダーに載せる）
 */
export const useVideoUpload = () => {
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

  const upload = useCallback(
    ({ threadId, file, angle, durationSec, frameRate }: UploadInput) =>
      new Promise<string | null>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/threads/${threadId}/videos`)
        xhr.setRequestHeader('content-type', file.type)
        xhr.setRequestHeader('x-video-angle', angle)
        if (durationSec !== null) {
          xhr.setRequestHeader('x-video-duration', String(durationSec))
        }
        if (frameRate !== null) {
          xhr.setRequestHeader('x-video-frame-rate', String(frameRate))
        }
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setState({ kind: 'uploading', progress: event.loaded / event.total })
          }
        }
        xhr.onload = () => {
          const videoId = readVideoId(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && videoId) {
            setState({ kind: 'done' })
            resolve(videoId)
          } else {
            setState({ kind: 'error', message: parseMessage(xhr.responseText) })
            resolve(null)
          }
        }
        xhr.onerror = () => {
          setState({ kind: 'error', message: parseMessage('') })
          resolve(null)
        }
        setState({ kind: 'uploading', progress: 0 })
        xhr.send(file)
      }),
    []
  )

  return { state, upload }
}
