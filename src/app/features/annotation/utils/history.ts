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
  /** 置いた図形を直す（角度・長さ・大きさ・位置・色） */
  | { type: 'update'; index: number; annotation: Annotation }
  /** 置いた図形を1つだけ消す */
  | { type: 'remove'; index: number }
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
    case 'update':
      if (!history.present[action.index]) return history
      return push(
        history,
        history.present.map((a, i) => (i === action.index ? action.annotation : a))
      )
    case 'remove':
      if (!history.present[action.index]) return history
      return push(
        history,
        history.present.filter((_, i) => i !== action.index)
      )
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
