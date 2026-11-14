'use client'

import type { AnnotationEditor } from '../hooks/useAnnotationEditor'
import {
  ANNOTATION_COLORS,
  ANNOTATION_TOOLS,
  type AnnotationColor,
  type AnnotationTool,
} from '../utils/shapes'

type Props = {
  editor: AnnotationEditor
}

const TOOL_LABEL = {
  line: '直線',
  arrow: '矢印',
  circle: '円',
  free: 'フリー',
} as const satisfies Record<AnnotationTool, string>

const COLOR_LABEL = {
  '#5FD4A0': 'ミント',
  '#FF4D4F': '赤',
  '#FFD600': '黄',
} as const satisfies Record<AnnotationColor, string>

/** 線引きの道具・色・元に戻す */
export const AnnotationToolbar = ({ editor }: Props) => (
  <div className="rounded-card flex flex-wrap items-center gap-3 bg-white p-3 shadow-sm">
    <fieldset className="flex rounded-full border border-gray-200 p-0.5">
      <legend className="sr-only">線の種類</legend>
      {ANNOTATION_TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          aria-pressed={editor.tool === tool}
          onClick={() => editor.setTool(tool)}
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            editor.tool === tool ? 'bg-ink text-white' : 'text-gray-600'
          }`}
        >
          {TOOL_LABEL[tool]}
        </button>
      ))}
    </fieldset>

    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">線の色</legend>
      {ANNOTATION_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={COLOR_LABEL[color]}
          aria-pressed={editor.color === color}
          onClick={() => editor.setColor(color)}
          style={{ backgroundColor: color }}
          className={`size-8 rounded-full ring-offset-2 ${
            editor.color === color ? 'ring-ink ring-2' : ''
          }`}
        />
      ))}
    </fieldset>

    <div className="ml-auto flex gap-2">
      <button
        type="button"
        onClick={editor.undo}
        disabled={!editor.canUndo}
        className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-bold text-gray-800 disabled:opacity-40"
      >
        元に戻す
      </button>
      <button
        type="button"
        onClick={editor.clear}
        disabled={editor.annotations.length === 0}
        className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-bold text-gray-800 disabled:opacity-40"
      >
        全部消す
      </button>
    </div>
  </div>
)
