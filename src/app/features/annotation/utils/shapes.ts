import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'

/**
 * 線引きの図形の計算。DOM に依存しない（ネイティブアプリでも使う）
 *
 * 座標は動画に対して 0〜1。円の半径と長さは「動画の幅」を 1 とした値で扱う
 */

export const ANNOTATION_TOOLS = ['line', 'arrow', 'circle', 'free'] as const
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number]

export const ANNOTATION_COLORS = ['#5FD4A0', '#FF4D4F', '#FFD600'] as const
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]

/** これより短い線・小さい円は、タップの誤操作とみなして捨てる（動画の幅に対する割合） */
const MIN_SHAPE_LENGTH = 0.01
/** フリーハンドで、前の点からこれ以上動いたときだけ点を足す（点の数を抑える） */
const FREE_POINT_STEP = 0.004

/** 線の太さ（動画の幅に対する割合）。解像度が違っても見た目の太さをそろえる */
export const STROKE_WIDTH_RATIO = 0.014

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)

export type ClampPoint = (point: NormalizedPoint) => NormalizedPoint
export const clampPoint: ClampPoint = (point) => ({ x: clamp01(point.x), y: clamp01(point.y) })

/**
 * 2点の距離（動画の幅を 1 とする）
 *
 * @param aspect 動画の高さ÷幅。縦動画なら 1 より大きい
 */
export type DistanceInWidth = (a: NormalizedPoint, b: NormalizedPoint, aspect: number) => number
export const distanceInWidth: DistanceInWidth = (a, b, aspect) =>
  Math.hypot(b.x - a.x, (b.y - a.y) * aspect)

/** なぞった点の列に、次の点を足す（近すぎる点は足さない） */
export type AppendStrokePoint = (
  points: readonly NormalizedPoint[],
  point: NormalizedPoint,
  aspect: number
) => NormalizedPoint[]
export const appendStrokePoint: AppendStrokePoint = (points, point, aspect) => {
  const last = points.at(-1)
  if (last && distanceInWidth(last, point, aspect) < FREE_POINT_STEP) {
    return [...points]
  }
  return [...points, clampPoint(point)]
}

export type BuildAnnotation = (params: {
  tool: AnnotationTool
  color: AnnotationColor
  /** 指を置いてから離すまでの点。直線・矢印・円は最初と最後の点だけを使う */
  points: readonly NormalizedPoint[]
  aspect: number
}) => Annotation | null

/** なぞった点から図形を作る。小さすぎるときは null */
export const buildAnnotation: BuildAnnotation = ({ tool, color, points, aspect }) => {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) {
    return null
  }

  switch (tool) {
    case 'line':
    case 'arrow': {
      if (distanceInWidth(first, last, aspect) < MIN_SHAPE_LENGTH) return null
      return { kind: tool, from: clampPoint(first), to: clampPoint(last), color }
    }
    case 'circle': {
      const radius = Math.min(distanceInWidth(first, last, aspect), 1)
      if (radius < MIN_SHAPE_LENGTH) return null
      return { kind: 'circle', center: clampPoint(first), radius, color }
    }
    case 'free': {
      const length = points
        .slice(1)
        .reduce((sum, point, i) => sum + distanceInWidth(points[i] ?? point, point, aspect), 0)
      if (points.length < 2 || length < MIN_SHAPE_LENGTH) return null
      return { kind: 'free', points: points.map(clampPoint), color }
    }
  }
}

type PixelPoint = { x: number; y: number }

export type ArrowHeadPoints = (
  from: PixelPoint,
  to: PixelPoint,
  headLength: number
) => [PixelPoint, PixelPoint]

/** 矢印の先の「く」の字の両端（座標の単位は呼び出し側に合わせる） */
export const arrowHeadPoints: ArrowHeadPoints = (from, to, headLength) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const spread = Math.PI / 7
  const wing = (offset: number): PixelPoint => ({
    x: to.x - headLength * Math.cos(angle + offset),
    y: to.y - headLength * Math.sin(angle + offset),
  })
  return [wing(spread), wing(-spread)]
}
