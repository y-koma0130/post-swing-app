import type { Annotation } from '@/server/features/thread/domain/values/Annotation'

/**
 * 線の一覧と「元に戻す」の履歴。DOM・React に依存しない
 *
 * 「全部消す」も元に戻せるよう、操作のたびに一覧の写しを積む
 */
export type AnnotationHistory = Readonly<{
  past: readonly (readonly Annotation[])[]
  present: readonly Annotation[]
}>

export type AnnotationHistoryAction =
  | { type: 'add'; annotation: Annotation }
  | { type: 'undo' }
  | { type: 'clear' }
  /** 動画を差し替えたときなど、履歴ごと捨てる */
  | { type: 'reset' }

/** 履歴が増えすぎないようにする */
const MAX_HISTORY = 50

export const EMPTY_ANNOTATION_HISTORY: AnnotationHistory = { past: [], present: [] }

const push = (history: AnnotationHistory, next: readonly Annotation[]): AnnotationHistory => ({
  past: [...history.past, history.present].slice(-MAX_HISTORY),
  present: next,
})

export type ReduceAnnotationHistory = (
  history: AnnotationHistory,
  action: AnnotationHistoryAction
) => AnnotationHistory

export const reduceAnnotationHistory: ReduceAnnotationHistory = (history, action) => {
  switch (action.type) {
    case 'add':
      return push(history, [...history.present, action.annotation])
    case 'undo': {
      const previous = history.past.at(-1)
      if (!previous) return history
      return { past: history.past.slice(0, -1), present: previous }
    }
    case 'clear':
      if (history.present.length === 0) return history
      return push(history, [])
    case 'reset':
      return EMPTY_ANNOTATION_HISTORY
  }
}
