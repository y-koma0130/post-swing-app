'use client'

import { type PointerEvent, useState } from 'react'
import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'
import type { AnnotationEditor } from '../hooks/useAnnotationEditor'
import { appendStrokePoint, buildAnnotation, clampPoint } from '../utils/shapes'
import { AnnotationShape } from './AnnotationShape'

type Props = {
  editor: AnnotationEditor
  /** 動画の元の大きさ。表示の大きさが変わっても、線の位置と太さの比率を保つ */
  width: number
  height: number
}

/**
 * 動画に重ねる線引きの層。動画と同じ大きさの箱に置く
 *
 * マウス・指・Apple Pencil を Pointer Events でまとめて扱う
 */
export const AnnotationLayer = ({ editor, width, height }: Props) => {
  const [stroke, setStroke] = useState<{ pointerId: number; points: NormalizedPoint[] } | null>(
    null
  )
  const aspect = height / width

  const toPoint = (event: PointerEvent<SVGSVGElement>): NormalizedPoint => {
    const rect = event.currentTarget.getBoundingClientRect()
    return clampPoint({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    })
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    // 2本目の指やマウスの右クリックは無視する
    if (stroke || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setStroke({ pointerId: event.pointerId, points: [toPoint(event)] })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!stroke || stroke.pointerId !== event.pointerId) return
    const point = toPoint(event)
    const first = stroke.points[0]
    setStroke({
      pointerId: stroke.pointerId,
      // 直線・矢印・円は始点と今の点だけでよい
      points:
        editor.tool === 'free' || !first
          ? appendStrokePoint(stroke.points, point, aspect)
          : [first, point],
    })
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!stroke || stroke.pointerId !== event.pointerId) return
    const annotation = buildAnnotation({
      tool: editor.tool,
      color: editor.color,
      points: stroke.points,
      aspect,
    })
    if (annotation) {
      editor.add(annotation)
    }
    setStroke(null)
  }

  const onPointerCancel = () => setStroke(null)

  const draft: Annotation | null = stroke
    ? buildAnnotation({ tool: editor.tool, color: editor.color, points: stroke.points, aspect })
    : null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none select-none"
      role="img"
      aria-label="動画への線引き"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {editor.annotations.map((annotation, index) => (
        // 線は追加と末尾からの取り消ししかしないので、順番を key にしてよい
        // biome-ignore lint/suspicious/noArrayIndexKey: 上のとおり並びが入れ替わらない
        <AnnotationShape key={index} annotation={annotation} width={width} height={height} />
      ))}
      {draft && <AnnotationShape annotation={draft} width={width} height={height} />}
    </svg>
  )
}
