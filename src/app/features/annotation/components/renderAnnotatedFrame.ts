import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import {
  angleDegrees,
  angleMarker,
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
    case 'angle': {
      const vertex = toPixel(annotation.vertex)
      const a = toPixel(annotation.a)
      const b = toPixel(annotation.b)
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(vertex.x, vertex.y)
      ctx.lineTo(b.x, b.y)
      strokeWithOutline(ctx, annotation.color, lineWidth)
      // 弧は線より細く、内側の角に描く（画面の SVG と同じ計算）
      const marker = angleMarker(vertex, a, b, lineWidth)
      ctx.beginPath()
      ctx.arc(vertex.x, vertex.y, marker.radius, marker.startAngle, marker.endAngle)
      strokeWithOutline(ctx, annotation.color, lineWidth * 0.6)
      // 数字：線の色の字に黒い縁
      const degrees = angleDegrees(annotation.vertex, annotation.a, annotation.b, height / width)
      ctx.font = `bold ${marker.fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = marker.fontSize * 0.22
      ctx.strokeStyle = OUTLINE_COLOR
      ctx.strokeText(`${degrees}°`, marker.label.x, marker.label.y)
      ctx.fillStyle = annotation.color
      ctx.fillText(`${degrees}°`, marker.label.x, marker.label.y)
      return
    }
    case 'free': {
      const [first, ...rest] = annotation.points.map(toPixel)
      if (!first) return
      ctx.moveTo(first.x, first.y)
      for (const p of rest) ctx.lineTo(p.x, p.y)
      break
    }
  }
  strokeWithOutline(ctx, annotation.color, lineWidth)
}

/** 下に黒い縁を敷いてから、線の色で描く（画面の SVG と同じ見た目） */
const strokeWithOutline = (ctx: CanvasRenderingContext2D, color: string, lineWidth: number) => {
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.lineWidth = lineWidth * OUTLINE_WIDTH_SCALE
  ctx.stroke()
  ctx.strokeStyle = color
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
