import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { calcSquareCrop } from '../utils/squareCrop'

/** プロフィール画像の一辺（サーバーの AVATAR_RULES.size と同じ） */
const AVATAR_SIZE = 512

/** 真ん中を正方形に切り抜き、512px の JPEG にする（写真の向きは EXIF に合わせる） */
const toSquareJpeg = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file)
  const { sx, sy, size } = calcSquareCrop(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))),
      'image/jpeg',
      0.85
    )
  )
}

const messageOf = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body
      if (typeof message === 'string') return message
    }
  } catch {
    // JSON でなければ下の文言
  }
  return '保存できませんでした。もう一度お試しください'
}

/** プロフィール画像を変える・外す */
export const useAvatarUpload = () => {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (request: () => Promise<Response>) => {
      setPending(true)
      setError(null)
      try {
        const response = await request()
        if (!response.ok) {
          setError(await messageOf(response))
          return
        }
        router.refresh()
      } catch {
        setError('画像を読み込めませんでした。別の画像でお試しください')
      } finally {
        setPending(false)
      }
    },
    [router]
  )

  const upload = useCallback(
    (file: File) =>
      run(async () => {
        const image = await toSquareJpeg(file)
        return fetch('/api/coach/avatar', {
          method: 'POST',
          headers: { 'content-type': 'image/jpeg' },
          body: image,
        })
      }),
    [run]
  )

  const remove = useCallback(
    () => run(() => fetch('/api/coach/avatar', { method: 'DELETE' })),
    [run]
  )

  return { upload, remove, pending, error }
}
