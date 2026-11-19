import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'
import { clampPoint, distanceInWidth } from './shapes'

/**
 * 置いた図形の選択と編集の計算。DOM に依存しない（ネイティブアプリでも使う）
 *
 * 座標は動画に対して 0〜1。距離は「動画の幅」を 1 とした値で比べる
 */

/** 図形を押したとみなす距離（動画の幅に対する割合） */
export const HIT_TOLERANCE = 0.03
/** つまみを押したとみなす距離（図形より少し広くして、つかみやすくする） */
export const HANDLE_TOLERANCE = 0.04
/** 円の半径の下限 */
const MIN_RADIUS = 0.01

/** つまみ：線・矢印の両端、円の縁、角度の頂点と2本の線の先。move は図形全体を動かす */
export type HandleId = 'from' | 'to' | 'radius' | 'vertex' | 'a' | 'b' | 'move'

export type Handle = Readonly<{ id: Exclude<HandleId, 'move'>; point: NormalizedPoint }>

/** 点 p から線分 ab までの距離（動画の幅を 1 とする） */
const distanceToSegment = (
  p: NormalizedPoint,
  a: NormalizedPoint,
  b: NormalizedPoint,
  aspect: number
): number => {
  const ax = a.x
  const ay = a.y * aspect
  const dx = b.x - ax
  const dy = b.y * aspect - ay
  const px = p.x
  const py = p.y * aspect
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq === 0 ? 0 : Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0), 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** 図形と点の距離。円は内側を押しても選べるよう、内側なら 0 */
const distanceToShape = (annotation: Annotation, p: NormalizedPoint, aspect: number): number => {
  switch (annotation.kind) {
    case 'line':
    case 'arrow':
      return distanceToSegment(p, annotation.from, annotation.to, aspect)
    case 'circle':
      return Math.max(distanceInWidth(annotation.center, p, aspect) - annotation.radius, 0)
    case 'angle':
      return Math.min(
        distanceToSegment(p, annotation.vertex, annotation.a, aspect),
        distanceToSegment(p, annotation.vertex, annotation.b, aspect)
      )
    case 'free':
      return annotation.points
        .slice(1)
        .reduce(
          (min, point, i) =>
            Math.min(min, distanceToSegment(p, annotation.points[i] ?? point, point, aspect)),
          Number.POSITIVE_INFINITY
        )
  }
}

/** 押した点にある図形（重なっていれば上に描いた方）。なければ -1 */
export const hitTest = (
  annotations: readonly Annotation[],
  p: NormalizedPoint,
  aspect: number
): number => {
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const annotation = annotations[i]
    if (annotation && distanceToShape(annotation, p, aspect) <= HIT_TOLERANCE) return i
  }
  return -1
}

/** 図形のつまみ（フリーハンドは移動だけなので、つまみはない） */
export const handlesOf = (annotation: Annotation): Handle[] => {
  switch (annotation.kind) {
    case 'line':
    case 'arrow':
      return [
        { id: 'from', point: annotation.from },
        { id: 'to', point: annotation.to },
      ]
    case 'circle':
      return [
        {
          id: 'radius',
          point: clampPoint({ x: annotation.center.x + annotation.radius, y: annotation.center.y }),
        },
      ]
    case 'angle':
      return [
        { id: 'vertex', point: annotation.vertex },
        { id: 'a', point: annotation.a },
        { id: 'b', point: annotation.b },
      ]
    case 'free':
      return []
  }
}

/** 押した点がつまみか、図形の上か。どちらでもなければ null */
export const handleAt = (
  annotation: Annotation,
  p: NormalizedPoint,
  aspect: number
): HandleId | null => {
  const handle = handlesOf(annotation).find(
    (h) => distanceInWidth(h.point, p, aspect) <= HANDLE_TOLERANCE
  )
  if (handle) return handle.id
  return distanceToShape(annotation, p, aspect) <= HIT_TOLERANCE ? 'move' : null
}

/** 図形全体をずらす（動画の外には出さない） */
export const translate = (annotation: Annotation, dx: number, dy: number): Annotation => {
  const move = (p: NormalizedPoint) => clampPoint({ x: p.x + dx, y: p.y + dy })
  switch (annotation.kind) {
    case 'line':
    case 'arrow':
      return { ...annotation, from: move(annotation.from), to: move(annotation.to) }
    case 'circle':
      return { ...annotation, center: move(annotation.center) }
    case 'angle':
      return {
        ...annotation,
        vertex: move(annotation.vertex),
        a: move(annotation.a),
        b: move(annotation.b),
      }
    case 'free':
      return { ...annotation, points: annotation.points.map(move) }
  }
}

/**
 * つまみを start から current まで動かしたあとの図形
 * （original はつかんだ時点の図形。動かすたびに original から計算して、ずれを溜めない）
 */
export const dragHandle = (
  original: Annotation,
  handle: HandleId,
  start: NormalizedPoint,
  current: NormalizedPoint,
  aspect: number
): Annotation => {
  if (handle === 'move') return translate(original, current.x - start.x, current.y - start.y)
  const point = clampPoint(current)
  if (
    (original.kind === 'line' || original.kind === 'arrow') &&
    (handle === 'from' || handle === 'to')
  ) {
    return { ...original, [handle]: point }
  }
  if (original.kind === 'angle' && (handle === 'vertex' || handle === 'a' || handle === 'b')) {
    return { ...original, [handle]: point }
  }
  if (original.kind === 'circle' && handle === 'radius') {
    return {
      ...original,
      radius: Math.min(Math.max(distanceInWidth(original.center, point, aspect), MIN_RADIUS), 1),
    }
  }
  return original
}
