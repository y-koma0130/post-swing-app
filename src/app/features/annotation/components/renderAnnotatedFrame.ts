import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import {
  arrowHeadPoints,
  OUTLINE_COLOR,
  OUTLINE_WIDTH_SCALE,
  STROKE_WIDTH_RATIO,
} from '../utils/shapes'

/** 画像の長い辺の上限。生徒がスマホで見るには十分で、送る量を抑える */
const MAX_EDGE = 1280

const drawAnnotation = (
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number
) => {
  const toPixel = (p: { x: number; y: number }) => ({ x: p.x * width, y: p.y * height })
  const lineWidth = width * STROKE_WIDTH_RATIO
  ctx.beginPath()
  switch (annotation.kind) {
    case 'line':
    case 'arrow': {
      const from = toPixel(annotation.from)
      const to = toPixel(annotation.to)
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      if (annotation.kind === 'arrow') {
        const [left, right] = arrowHeadPoints(from, to, lineWidth * 4)
        ctx.moveTo(left.x, left.y)
        ctx.lineTo(to.x, to.y)
        ctx.lineTo(right.x, right.y)
      }
      break
    }
    case 'circle': {
      const center = toPixel(annotation.center)
      ctx.arc(center.x, center.y, annotation.radius * width, 0, Math.PI * 2)
      break
    }
    case 'free': {
      const [first, ...rest] = annotation.points.map(toPixel)
      if (!first) return
      ctx.moveTo(first.x, first.y)
      for (const p of rest) ctx.lineTo(p.x, p.y)
      break
    }
  }
  // 下に黒い縁を敷いてから、線の色で描く（画面の SVG と同じ見た目）
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.lineWidth = lineWidth * OUTLINE_WIDTH_SCALE
  ctx.stroke()
  ctx.strokeStyle = annotation.color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

/**
 * 動画のいまのコマに線を重ねて PNG にする（添削カードの画像）
 * 線は画面の SVG と同じ計算で描くので、見た目がそろう
 */
export const renderAnnotatedFrame = async (
  video: HTMLVideoElement,
  annotations: readonly Annotation[]
): Promise<Blob> => {
  const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight))
  const width = Math.round(video.videoWidth * scale)
  const height = Math.round(video.videoHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('画像を作れませんでした')
  }
  ctx.drawImage(video, 0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation, width, height)
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像を作れませんでした'))
    }, 'image/png')
  })
}
