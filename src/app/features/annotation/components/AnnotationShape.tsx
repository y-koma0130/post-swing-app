import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import {
  angleDegrees,
  angleMarker,
  arrowHeadPoints,
  OUTLINE_COLOR,
  OUTLINE_WIDTH_SCALE,
  STROKE_WIDTH_RATIO,
} from '../utils/shapes'

type Props = {
  annotation: Annotation
  /** 動画の元の大きさ（SVG の viewBox と同じ） */
  width: number
  height: number
}

/** 線1本を SVG で描く。座標は 0〜1 から動画のピクセルに直す。下に黒い縁を敷いて、どの背景でも見えるようにする */
export const AnnotationShape = (props: Props) => (
  <g>
    <ShapePath {...props} stroke={OUTLINE_COLOR} widthScale={OUTLINE_WIDTH_SCALE} />
    <ShapePath {...props} stroke={props.annotation.color} widthScale={1} />
    {props.annotation.kind === 'angle' && <AngleLabel {...props} annotation={props.annotation} />}
  </g>
)

type AngleAnnotation = Extract<Annotation, { kind: 'angle' }>

/** 角度の数字（線の色の字に黒い縁。芝の上でも読めるように） */
const AngleLabel = ({ annotation, width, height }: Props & { annotation: AngleAnnotation }) => {
  const toPixel = (point: { x: number; y: number }) => ({ x: point.x * width, y: point.y * height })
  const marker = angleMarker(
    toPixel(annotation.vertex),
    toPixel(annotation.a),
    toPixel(annotation.b),
    width * STROKE_WIDTH_RATIO
  )
  const degrees = angleDegrees(annotation.vertex, annotation.a, annotation.b, height / width)
  return (
    <text
      x={marker.label.x}
      y={marker.label.y}
      fontSize={marker.fontSize}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="central"
      fill={annotation.color}
      stroke={OUTLINE_COLOR}
      strokeWidth={marker.fontSize * 0.22}
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {degrees}°
    </text>
  )
}

const ShapePath = ({
  annotation,
  width,
  height,
  stroke,
  widthScale,
}: Props & { stroke: string; widthScale: number }) => {
  const baseWidth = width * STROKE_WIDTH_RATIO
  const strokeWidth = baseWidth * widthScale
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const
  const toPixel = (point: { x: number; y: number }) => ({ x: point.x * width, y: point.y * height })

  switch (annotation.kind) {
    case 'line':
    case 'arrow': {
      const from = toPixel(annotation.from)
      const to = toPixel(annotation.to)
      const line = <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} {...common} />
      if (annotation.kind === 'line') return line
      const [left, right] = arrowHeadPoints(from, to, baseWidth * 4)
      return (
        <g>
          {line}
          <polyline
            points={`${left.x},${left.y} ${to.x},${to.y} ${right.x},${right.y}`}
            {...common}
          />
        </g>
      )
    }
    case 'circle': {
      const center = toPixel(annotation.center)
      return <circle cx={center.x} cy={center.y} r={annotation.radius * width} {...common} />
    }
    case 'angle': {
      const vertex = toPixel(annotation.vertex)
      const a = toPixel(annotation.a)
      const b = toPixel(annotation.b)
      const marker = angleMarker(vertex, a, b, baseWidth)
      return (
        <g>
          <polyline points={`${a.x},${a.y} ${vertex.x},${vertex.y} ${b.x},${b.y}`} {...common} />
          {/* 内側の角に小さな弧（時計回りに描く） */}
          <path
            d={`M ${marker.start.x} ${marker.start.y} A ${marker.radius} ${marker.radius} 0 0 1 ${marker.end.x} ${marker.end.y}`}
            {...common}
            strokeWidth={strokeWidth * 0.6}
          />
        </g>
      )
    }
    case 'free':
      return (
        <polyline
          points={annotation.points
            .map(toPixel)
            .map((p) => `${p.x},${p.y}`)
            .join(' ')}
          {...common}
        />
      )
  }
}
