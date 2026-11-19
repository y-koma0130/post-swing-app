import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { compareLayout, type Rect } from '../utils/compareLayout'
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
  return toPngBlob(canvas)
}

const toPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像を作れませんでした'))
    }, 'image/png')
  })

/** 1本分（動画のコマと線）を rect の中に描く。線の位置は rect の中で 0〜1 */
const drawPane = (
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  annotations: readonly Annotation[],
  rect: Rect,
  label: string
) => {
  ctx.save()
  ctx.translate(rect.x, rect.y)
  ctx.drawImage(video, 0, 0, rect.width, rect.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation, rect.width, rect.height)
  }
  // 左上に呼び方（「1回目・正面」など）
  const fontSize = Math.max(Math.round(rect.width * 0.04), 14)
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const padding = fontSize * 0.5
  const labelWidth = ctx.measureText(label).width + padding * 2
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.beginPath()
  ctx.roundRect(padding, padding, labelWidth, fontSize * 1.6, fontSize * 0.8)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(label, padding * 2, padding + fontSize * 0.8)
  ctx.restore()
}

/**
 * 2本の動画のいまのコマに、それぞれの線を重ねて、1枚の PNG に並べる（比較の添削カード）
 * 並べ方は compareLayout（縦長どうしは左右、横長があれば上下）
 */
export const renderComparedFrame = async (
  left: { video: HTMLVideoElement; annotations: readonly Annotation[]; label: string },
  right: { video: HTMLVideoElement; annotations: readonly Annotation[]; label: string }
): Promise<Blob> => {
  const layout = compareLayout(
    { width: left.video.videoWidth, height: left.video.videoHeight },
    { width: right.video.videoWidth, height: right.video.videoHeight }
  )
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('画像を作れませんでした')
  }
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, layout.width, layout.height)
  drawPane(ctx, left.video, left.annotations, layout.left, left.label)
  drawPane(ctx, right.video, right.annotations, layout.right, right.label)
  return toPngBlob(canvas)
}
