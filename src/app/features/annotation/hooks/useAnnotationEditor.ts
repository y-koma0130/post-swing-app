import { useCallback, useEffect, useReducer, useState } from 'react'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { EMPTY_ANNOTATION_HISTORY, reduceAnnotationHistory } from '../utils/history'
import { ANNOTATION_COLORS, type AnnotationColor, type AnnotationTool } from '../utils/shapes'

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * 線引きの状態（描いた線・選んでいる道具と色・元に戻す）
 *
 * キーボード：⌘Z / Ctrl+Z で元に戻す
 */
export const useAnnotationEditor = () => {
  const [history, dispatch] = useReducer(reduceAnnotationHistory, EMPTY_ANNOTATION_HISTORY)
  const [tool, setTool] = useState<AnnotationTool>('line')
  const [color, setColor] = useState<AnnotationColor>(ANNOTATION_COLORS[0])

  const add = useCallback((annotation: Annotation) => dispatch({ type: 'add', annotation }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])

  return {
    annotations: history.present,
    canUndo: history.past.length > 0,
    tool,
    color,
    setTool,
    setColor,
    add,
    undo,
    clear,
    reset,
  }
}

export type AnnotationEditor = ReturnType<typeof useAnnotationEditor>
