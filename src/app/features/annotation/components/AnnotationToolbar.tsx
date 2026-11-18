'use client'

import { Button } from '@/app/components/ui/Button'
import type { AnnotationEditor } from '../hooks/useAnnotationEditor'
import {
  ANNOTATION_COLORS,
  ANNOTATION_TOOLS,
  type AnnotationColor,
  type EditorTool,
} from '../utils/shapes'

type Props = {
  editor: AnnotationEditor
}

const TOOLS = ['select', ...ANNOTATION_TOOLS] as const satisfies EditorTool[]

const TOOL_LABEL = {
  select: '選択',
  line: '直線',
  arrow: '矢印',
  circle: '円',
  free: 'フリー',
} as const satisfies Record<EditorTool, string>

const COLOR_LABEL = {
  '#FFFFFF': 'ホワイト',
  '#FFD54A': 'サンイエロー',
  '#FF6B5B': 'コーラル',
} as const satisfies Record<AnnotationColor, string>

/** 線引きの道具・色・元に戻す。「選択」で置いた図形を選ぶと、色を変えたり消したりできる */
export const AnnotationToolbar = ({ editor }: Props) => (
  <div className="rounded-card flex flex-wrap items-center gap-3 bg-white p-3 shadow-sm">
    <fieldset className="border-line flex rounded-full border p-0.5">
      <legend className="sr-only">線の種類</legend>
      {TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          aria-pressed={editor.tool === tool}
          onClick={() => editor.setTool(tool)}
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            editor.tool === tool ? 'bg-ink text-white' : 'text-muted'
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
          className={`border-line size-8 rounded-full border ring-offset-2 ${
            editor.color === color ? 'ring-ink ring-2' : ''
          }`}
        />
      ))}
    </fieldset>

    <div className="ml-auto flex gap-2">
      {editor.selected !== null && (
        <Button variant="danger" size="sm" onClick={editor.removeSelected}>
          削除
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={editor.undo} disabled={!editor.canUndo}>
        元に戻す
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={editor.clear}
        disabled={editor.annotations.length === 0}
      >
        全部消す
      </Button>
    </div>
  </div>
)
