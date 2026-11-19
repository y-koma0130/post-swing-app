import { useCallback, useEffect, useReducer, useState } from 'react'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { EMPTY_ANNOTATION_HISTORY, reduceAnnotationHistory } from '../utils/history'
import { ANNOTATION_COLORS, type AnnotationColor, type EditorTool } from '../utils/shapes'

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * 線引きの状態（描いた線・選んでいる道具と色・選んだ図形・元に戻す）
 *
 * キーボード：⌘Z / Ctrl+Z で元に戻す、Delete / Backspace で選んだ図形を消す。
 * 2つの画面に線を引くとき（比較）は、選んでいる画面の分だけキーボードを受ける（keyboard: false で受けない）
 */
export const useAnnotationEditor = ({ keyboard = true }: { keyboard?: boolean } = {}) => {
  const [history, dispatch] = useReducer(reduceAnnotationHistory, EMPTY_ANNOTATION_HISTORY)
  const [tool, setToolState] = useState<EditorTool>('line')
  const [color, setColorState] = useState<AnnotationColor>(ANNOTATION_COLORS[0])
  /** 選んでいる図形（「選択」の道具のとき）。なければ null */
  const [selected, setSelected] = useState<number | null>(null)

  const add = useCallback((annotation: Annotation) => dispatch({ type: 'add', annotation }), [])
  const update = useCallback(
    (index: number, annotation: Annotation) => dispatch({ type: 'update', index, annotation }),
    []
  )
  const undo = useCallback(() => {
    setSelected(null)
    dispatch({ type: 'undo' })
  }, [])
  const clear = useCallback(() => {
    setSelected(null)
    dispatch({ type: 'clear' })
  }, [])
  const reset = useCallback(() => {
    setSelected(null)
    dispatch({ type: 'reset' })
  }, [])
  const removeSelected = useCallback(() => {
    if (selected === null) return
    dispatch({ type: 'remove', index: selected })
    setSelected(null)
  }, [selected])

  const setTool = useCallback((next: EditorTool) => {
    setToolState(next)
    if (next !== 'select') setSelected(null)
  }, [])

  /** 色を選ぶ。図形を選んでいれば、その図形の色も変える */
  const setColor = useCallback(
    (next: AnnotationColor) => {
      setColorState(next)
      const target = selected === null ? undefined : history.present[selected]
      if (selected !== null && target && target.color !== next) {
        dispatch({ type: 'update', index: selected, annotation: { ...target, color: next } })
      }
    },
    [selected, history.present]
  )

  useEffect(() => {
    if (!keyboard) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected !== null) {
        event.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyboard, undo, removeSelected, selected])

  return {
    annotations: history.present,
    canUndo: history.past.length > 0,
    tool,
    color,
    selected,
    setTool,
    setColor,
    select: setSelected,
    add,
    update,
    removeSelected,
    undo,
    clear,
    reset,
  }
}

export type AnnotationEditor = ReturnType<typeof useAnnotationEditor>
