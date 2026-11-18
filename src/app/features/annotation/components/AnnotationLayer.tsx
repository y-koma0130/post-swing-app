'use client'

import { type PointerEvent, useState } from 'react'
import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'
import type { AnnotationEditor } from '../hooks/useAnnotationEditor'
import { dragHandle, type HandleId, handleAt, handlesOf, hitTest } from '../utils/editing'
import { appendStrokePoint, buildAnnotation, clampPoint, STROKE_WIDTH_RATIO } from '../utils/shapes'
import { AnnotationShape } from './AnnotationShape'

type Props = {
  editor: AnnotationEditor
  /** 動画の元の大きさ。表示の大きさが変わっても、線の位置と太さの比率を保つ */
  width: number
  height: number
}

/** 選んだ図形をつまんで動かしている途中 */
type Drag = {
  pointerId: number
  index: number
  handle: HandleId
  start: NormalizedPoint
  original: Annotation
  current: Annotation
}

/**
 * 動画に重ねる線引きの層。動画と同じ大きさの箱に置く
 *
 * マウス・指・Apple Pencil を Pointer Events でまとめて扱う。
 * 「選択」の道具では、置いた図形を押して選び、つまみで角度・長さ・大きさを直したり、全体を動かしたりする
 */
export const AnnotationLayer = ({ editor, width, height }: Props) => {
  const [stroke, setStroke] = useState<{ pointerId: number; points: NormalizedPoint[] } | null>(
    null
  )
  const [drag, setDrag] = useState<Drag | null>(null)
  const aspect = height / width
  const selecting = editor.tool === 'select'

  const toPoint = (event: PointerEvent<SVGSVGElement>): NormalizedPoint => {
    const rect = event.currentTarget.getBoundingClientRect()
    return clampPoint({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    })
  }

  const startDrag = (event: PointerEvent<SVGSVGElement>, point: NormalizedPoint) => {
    const selected = editor.selected === null ? undefined : editor.annotations[editor.selected]
    // 選んでいる図形のつまみ・本体を押したら、それを動かす
    const onSelected = selected ? handleAt(selected, point, aspect) : null
    if (selected && editor.selected !== null && onSelected) {
      setDrag({
        pointerId: event.pointerId,
        index: editor.selected,
        handle: onSelected,
        start: point,
        original: selected,
        current: selected,
      })
      return
    }
    // ほかの図形を押したら選び、そのまま動かせるようにする。何もないところなら選択を外す
    const hit = hitTest(editor.annotations, point, aspect)
    const target = editor.annotations[hit]
    editor.select(hit >= 0 ? hit : null)
    if (target) {
      setDrag({
        pointerId: event.pointerId,
        index: hit,
        handle: 'move',
        start: point,
        original: target,
        current: target,
      })
    }
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    // 2本目の指やマウスの右クリックは無視する
    if (stroke || drag || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toPoint(event)
    if (selecting) {
      startDrag(event, point)
      return
    }
    setStroke({ pointerId: event.pointerId, points: [point] })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const point = toPoint(event)
    if (drag && drag.pointerId === event.pointerId) {
      setDrag({
        ...drag,
        current: dragHandle(drag.original, drag.handle, drag.start, point, aspect),
      })
      return
    }
    if (!stroke || stroke.pointerId !== event.pointerId || editor.tool === 'select') return
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
    if (drag && drag.pointerId === event.pointerId) {
      // 動かしたときだけ履歴に積む（押しただけなら選ぶだけ）
      if (drag.current !== drag.original) editor.update(drag.index, drag.current)
      setDrag(null)
      return
    }
    if (!stroke || stroke.pointerId !== event.pointerId || editor.tool === 'select') return
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

  const onPointerCancel = () => {
    setStroke(null)
    setDrag(null)
  }

  const draft: Annotation | null =
    stroke && editor.tool !== 'select'
      ? buildAnnotation({ tool: editor.tool, color: editor.color, points: stroke.points, aspect })
      : null

  // 動かしている途中の図形は、元の図形の代わりに描く
  const shown = editor.annotations.map((annotation, index) =>
    drag && drag.index === index ? drag.current : annotation
  )
  const selected = editor.selected === null ? undefined : shown[editor.selected]
  const handleRadius = width * STROKE_WIDTH_RATIO * 1.4

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`absolute inset-0 h-full w-full touch-none select-none ${
        selecting ? 'cursor-default' : 'cursor-crosshair'
      }`}
      role="img"
      aria-label="動画への線引き"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {shown.map((annotation, index) => (
        // 並びは追加・削除・元に戻すでしか変わらず、描くたびに作り直すので順番を key にしてよい
        // biome-ignore lint/suspicious/noArrayIndexKey: 上のとおり
        <AnnotationShape key={index} annotation={annotation} width={width} height={height} />
      ))}
      {draft && <AnnotationShape annotation={draft} width={width} height={height} />}
      {selecting && selected && (
        <g pointerEvents="none">
          {/* フリーハンドはつまみがないので、選んだことが分かるよう描き始めに印を出す */}
          {selected.kind === 'free' && selected.points[0] && (
            <circle
              cx={selected.points[0].x * width}
              cy={selected.points[0].y * height}
              r={handleRadius}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={handleRadius * 0.35}
              strokeDasharray={`${handleRadius * 0.6} ${handleRadius * 0.4}`}
            />
          )}
          {handlesOf(selected).map((handle) => (
            <circle
              key={handle.id}
              cx={handle.point.x * width}
              cy={handle.point.y * height}
              r={handleRadius}
              fill="#FFFFFF"
              stroke="#0b3d2c"
              strokeWidth={handleRadius * 0.35}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
