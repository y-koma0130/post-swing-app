import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import {
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
  </g>
)

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
