import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'

/**
 * 線引きの図形の計算。DOM に依存しない（ネイティブアプリでも使う）
 *
 * 座標は動画に対して 0〜1。円の半径と長さは「動画の幅」を 1 とした値で扱う
 */

export const ANNOTATION_TOOLS = ['line', 'arrow', 'circle', 'free', 'angle'] as const
export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number]

/** 道具：図形を描く道具と、置いた図形を選んで直す「選択」 */
export type EditorTool = AnnotationTool | 'select'

/**
 * 線の色。芝の緑・空・室内の壁のどれの上でも見えることを優先し、ブランドのミントと喧嘩しない3色
 * - ホワイト：どの背景でも見える基本の色
 * - サンイエロー：ゴルフ場の明るさ。芝の上で目立つ
 * - コーラル：ミントの補色寄り。注意点を示す
 */
export const ANNOTATION_COLORS = ['#FFFFFF', '#FFD54A', '#FF6B5B'] as const
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]

/** これより短い線・小さい円は、タップの誤操作とみなして捨てる（動画の幅に対する割合） */
const MIN_SHAPE_LENGTH = 0.01
/** フリーハンドで、前の点からこれ以上動いたときだけ点を足す（点の数を抑える） */
const FREE_POINT_STEP = 0.004

/** 線の太さ（動画の幅に対する割合）。解像度が違っても見た目の太さをそろえる */
export const STROKE_WIDTH_RATIO = 0.014

/** 線の下に敷く縁（明るい背景でも白や黄色の線が見えるように） */
export const OUTLINE_COLOR = 'rgba(0, 0, 0, 0.4)'
/** 縁の太さ（線の太さに対する倍率） */
export const OUTLINE_WIDTH_SCALE = 1.7

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
  /** 角度は2回に分けて描くので、ここでは作らない（buildAngle を使う） */
  tool: Exclude<AnnotationTool, 'angle'>
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

/** 動画のピクセルの比に直したベクトル（縦動画でも角度がずれないよう、y に縦横比を掛ける） */
const toAspectVector = (from: NormalizedPoint, to: NormalizedPoint, aspect: number) => ({
  x: to.x - from.x,
  y: (to.y - from.y) * aspect,
})

export type AngleDegrees = (
  vertex: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint,
  aspect: number
) => number

/** 頂点から a・b への2本の線の間の角度（0〜180 の整数）。線の長さが 0 なら 0 */
export const angleDegrees: AngleDegrees = (vertex, a, b, aspect) => {
  const u = toAspectVector(vertex, a, aspect)
  const v = toAspectVector(vertex, b, aspect)
  const lengths = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)
  if (lengths === 0) return 0
  const cos = Math.min(Math.max((u.x * v.x + u.y * v.y) / lengths, -1), 1)
  return Math.round((Math.acos(cos) * 180) / Math.PI)
}

export type BuildAngle = (params: {
  vertex: NormalizedPoint
  a: NormalizedPoint
  b: NormalizedPoint
  color: AnnotationColor
  aspect: number
}) => Annotation | null

/** 角度の図形を作る。どちらかの線が短すぎるときは null */
export const buildAngle: BuildAngle = ({ vertex, a, b, color, aspect }) => {
  if (
    distanceInWidth(vertex, a, aspect) < MIN_SHAPE_LENGTH ||
    distanceInWidth(vertex, b, aspect) < MIN_SHAPE_LENGTH
  ) {
    return null
  }
  return { kind: 'angle', vertex: clampPoint(vertex), a: clampPoint(a), b: clampPoint(b), color }
}

/** 角度の弧と数字の置き場所（ピクセル。SVG とキャンバスで同じ計算を使う） */
export type AngleMarker = Readonly<{
  radius: number
  /** 弧の始まりと終わり（ラジアン。始まりから終わりへ時計回りに描くと、内側の角になる） */
  startAngle: number
  endAngle: number
  start: PixelPoint
  end: PixelPoint
  /** 数字の真ん中 */
  label: PixelPoint
  fontSize: number
}>

/**
 * 角度の弧と数字の位置
 *
 * @param baseWidth 線の太さ（ピクセル）。弧の大きさと文字の大きさをこれに合わせる
 */
export const angleMarker = (
  vertex: PixelPoint,
  a: PixelPoint,
  b: PixelPoint,
  baseWidth: number
): AngleMarker => {
  const angleA = Math.atan2(a.y - vertex.y, a.x - vertex.x)
  const angleB = Math.atan2(b.y - vertex.y, b.x - vertex.x)
  // a から b へ時計回りに測った角（0〜2π）。π を超えるなら、b から a へ回るほうが内側
  const clockwise = (((angleB - angleA) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const [startAngle, sweep] =
    clockwise <= Math.PI ? [angleA, clockwise] : [angleB, Math.PI * 2 - clockwise]
  const shortest = Math.min(
    Math.hypot(a.x - vertex.x, a.y - vertex.y),
    Math.hypot(b.x - vertex.x, b.y - vertex.y)
  )
  // 弧は短いほうの線の内側に収め、小さくなりすぎないようにする
  const radius = Math.max(Math.min(baseWidth * 4, shortest * 0.6), baseWidth * 1.5)
  const middle = startAngle + sweep / 2
  const fontSize = baseWidth * 2.6
  const labelDistance = radius + fontSize * 1.1
  const at = (angle: number, distance: number): PixelPoint => ({
    x: vertex.x + Math.cos(angle) * distance,
    y: vertex.y + Math.sin(angle) * distance,
  })
  return {
    radius,
    startAngle,
    endAngle: startAngle + sweep,
    start: at(startAngle, radius),
    end: at(startAngle + sweep, radius),
    label: at(middle, labelDistance),
    fontSize,
  }
}

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
