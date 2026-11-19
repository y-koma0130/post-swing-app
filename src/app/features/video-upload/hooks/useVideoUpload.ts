import { useCallback, useState } from 'react'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'done' }

type UploadInput = {
  /** 送り先（スレッドの動画・ドリルの動画で違う） */
  url: string
  file: File
  angle: VideoAngle
  /** 送る長さ（秒）。測れなければ null */
  durationSec: number | null
  /** 変換したときに測ったフレームレート。再生画面のコマ送りに使う */
  frameRate: number | null
  /** この画面を離れても進み具合を受け取りたいとき（画面の外で提出を進めるとき） */
  onProgress?: ((progress: number) => void) | undefined
}

export type UploadOutcome =
  | Readonly<{ ok: true; videoId: string }>
  | Readonly<{ ok: false; message: string }>

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
 * 提出に使う動画を1本上げる（下書き）。上げられたら動画の ID を、失敗したら文言を返す。
 * 進み具合を出すため fetch ではなく XMLHttpRequest を使う（本体はそのまま送り、角度などはヘッダーに載せる）
 */
export const useVideoUpload = () => {
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

  const upload = useCallback(
    ({ url, file, angle, durationSec, frameRate, onProgress }: UploadInput) =>
      new Promise<UploadOutcome>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)
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
            const progress = event.loaded / event.total
            setState({ kind: 'uploading', progress })
            onProgress?.(progress)
          }
        }
        xhr.onload = () => {
          const videoId = readVideoId(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && videoId) {
            setState({ kind: 'done' })
            resolve({ ok: true, videoId })
          } else {
            const message = parseMessage(xhr.responseText)
            setState({ kind: 'error', message })
            resolve({ ok: false, message })
          }
        }
        xhr.onerror = () => {
          const message = parseMessage('')
          setState({ kind: 'error', message })
          resolve({ ok: false, message })
        }
        setState({ kind: 'uploading', progress: 0 })
        xhr.send(file)
      }),
    []
  )

  return { state, upload }
}
