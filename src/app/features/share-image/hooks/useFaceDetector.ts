import { useCallback, useEffect, useRef, useState } from 'react'
import { type BlurBox, faceToBlurBox } from '../utils/blurBoxes'

/**
 * 顔の検出に使う MediaPipe のファイル。シェア画像を作る画面を開いたときにだけ読み込む。
 * 版は package.json の @mediapipe/tasks-vision とそろえる
 */
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

type Detector = Readonly<{
  detect: (image: HTMLImageElement) => {
    detections: ReadonlyArray<{
      boundingBox?: { originX: number; originY: number; width: number; height: number }
    }>
  }
  close: () => void
}>

export type FaceDetectorStatus = 'loading' | 'ready' | 'failed'

/**
 * ブラウザで顔を探す（画像はサーバーに送らない）。
 * 読み込めなかったとき（古い端末・通信の失敗）は failed になり、ぼかしの枠は手で付ける
 */
export const useFaceDetector = () => {
  const detector = useRef<Detector | null>(null)
  const [status, setStatus] = useState<FaceDetectorStatus>('loading')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
        const created = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.4,
        })
        if (cancelled) {
          created.close()
          return
        }
        detector.current = created
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }
    void load()
    return () => {
      cancelled = true
      detector.current?.close()
      detector.current = null
    }
  }, [])

  /** 画像の中の顔を、ぼかしの枠（0〜1）にして返す。使えなければ空 */
  const detectFaces = useCallback((image: HTMLImageElement): BlurBox[] => {
    if (!detector.current) return []
    try {
      const size = { width: image.naturalWidth, height: image.naturalHeight }
      return detector.current
        .detect(image)
        .detections.flatMap((d) => (d.boundingBox ? [faceToBlurBox(d.boundingBox, size)] : []))
    } catch {
      return []
    }
  }, [])

  return { status, detectFaces }
}
