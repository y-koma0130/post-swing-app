'use client'

import { type PointerEvent, useEffect, useState } from 'react'
import type { Annotation, NormalizedPoint } from '@/server/features/thread/domain/values/Annotation'
import type { AnnotationEditor } from '../hooks/useAnnotationEditor'
import { dragHandle, type HandleId, handleAt, handlesOf, hitTest } from '../utils/editing'
import {
  appendStrokePoint,
  buildAngle,
  buildAnnotation,
  clampPoint,
  distanceInWidth,
  STROKE_WIDTH_RATIO,
} from '../utils/shapes'
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
 * 「選択」の道具では、置いた図形を押して選び、つまみで角度・長さ・大きさを直したり、全体を動かしたりする。
 * 「角度」は2回に分けて描く：1本目をドラッグで引き（押し始めが頂点）、次に押した所が2本目の先になる
 */
export const AnnotationLayer = ({ editor, width, height }: Props) => {
  const [stroke, setStroke] = useState<{ pointerId: number; points: NormalizedPoint[] } | null>(
    null
  )
  const [drag, setDrag] = useState<Drag | null>(null)
  /** 角度の1本目を引き終え、2本目の先を待っているところ */
  const [pendingAngle, setPendingAngle] = useState<{
    vertex: NormalizedPoint
    a: NormalizedPoint
  } | null>(null)
  /** 2本目の先の候補（マウスなら乗せている所、指なら押している所） */
  const [angleCursor, setAngleCursor] = useState<NormalizedPoint | null>(null)
  const aspect = height / width
  const selecting = editor.tool === 'select'
  const angleTool = editor.tool === 'angle'
  const waitingSecondArm = angleTool ? pendingAngle : null

  // 道具を変えたら、描きかけの角度はやめる
  // biome-ignore lint/correctness/useExhaustiveDependencies: 道具が変わったときだけ動かす
  useEffect(() => {
    setPendingAngle(null)
    setAngleCursor(null)
  }, [editor.tool])

  // 2本目を待っているあいだは、Esc でやめられる
  useEffect(() => {
    if (!waitingSecondArm) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingAngle(null)
        setAngleCursor(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [waitingSecondArm])

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
    if (waitingSecondArm) setAngleCursor(point)
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
    // 角度の2本目は、押していなくても（マウスを乗せているだけでも）先を追う
    if (waitingSecondArm) {
      setAngleCursor(point)
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
    if (editor.tool === 'angle') {
      finishAngleStep(toPoint(event))
      setStroke(null)
      return
    }
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

  /** 角度：1本目を引き終えたら2本目を待ち、2本目の先を押したら図形にする */
  const finishAngleStep = (point: NormalizedPoint) => {
    if (waitingSecondArm) {
      const angle = buildAngle({ ...waitingSecondArm, b: point, color: editor.color, aspect })
      // 頂点のすぐ近くを押したときは、2本目を待ったままにする
      if (angle) {
        editor.add(angle)
        setPendingAngle(null)
        setAngleCursor(null)
      }
      return
    }
    const vertex = stroke?.points[0]
    if (vertex && distanceInWidth(vertex, point, aspect) >= 0.01) {
      setPendingAngle({ vertex, a: point })
      setAngleCursor(null)
    }
  }

  const onPointerCancel = () => {
    setStroke(null)
    setDrag(null)
  }

  const draft: Annotation | null = (() => {
    if (editor.tool === 'select') return null
    if (editor.tool === 'angle') {
      if (waitingSecondArm) {
        const cursor = angleCursor
          ? buildAngle({ ...waitingSecondArm, b: angleCursor, color: editor.color, aspect })
          : null
        // 2本目の先が決まるまでは、1本目だけを見せる
        return (
          cursor ?? {
            kind: 'line',
            from: waitingSecondArm.vertex,
            to: waitingSecondArm.a,
            color: editor.color,
          }
        )
      }
      return stroke
        ? buildAnnotation({ tool: 'line', color: editor.color, points: stroke.points, aspect })
        : null
    }
    return stroke
      ? buildAnnotation({ tool: editor.tool, color: editor.color, points: stroke.points, aspect })
      : null
  })()

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
      {waitingSecondArm && (
        <text
          x={width / 2}
          y={width * 0.06}
          fontSize={width * 0.032}
          fontWeight="bold"
          textAnchor="middle"
          fill="#FFFFFF"
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth={width * 0.008}
          paintOrder="stroke"
          pointerEvents="none"
        >
          2本目の先を押してください（Esc でやめる）
        </text>
      )}
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
