import { useCallback, useState } from 'react'

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'error'; message: string }
  | { kind: 'done' }

type UploadInput = {
  threadId: string
  file: File
  theme: string
  note: string
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
 * 動画を送る。進み具合を出すため fetch ではなく XMLHttpRequest を使う
 * （本体はそのまま送り、テーマとメモは URL エンコードしてヘッダーに載せる）
 */
export const useVideoUpload = () => {
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

  const upload = useCallback(
    ({ threadId, file, theme, note }: UploadInput) =>
      new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/threads/${threadId}/videos`)
        xhr.setRequestHeader('content-type', file.type)
        xhr.setRequestHeader('x-thread-theme', encodeURIComponent(theme))
        xhr.setRequestHeader('x-video-note', encodeURIComponent(note))
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setState({ kind: 'uploading', progress: event.loaded / event.total })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setState({ kind: 'done' })
            resolve(true)
          } else {
            setState({ kind: 'error', message: parseMessage(xhr.responseText) })
            resolve(false)
          }
        }
        xhr.onerror = () => {
          setState({ kind: 'error', message: parseMessage('') })
          resolve(false)
        }
        setState({ kind: 'uploading', progress: 0 })
        xhr.send(file)
      }),
    []
  )

  return { state, upload }
}
