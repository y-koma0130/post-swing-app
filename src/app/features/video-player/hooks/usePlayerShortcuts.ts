import { useEffect, useRef } from 'react'
import { isTypingTarget } from '@/app/hooks/isTypingTarget'

type Handlers = {
  /** ← → で1コマ動かす（-1 / 1） */
  onStep: (frames: number) => void
  /** スペースで再生・停止 */
  onToggle: () => void
}

/**
 * プレイヤーのキーボード操作（← → でコマ送り、スペースで再生・停止）
 *
 * 再生中は毎コマ描き直されて関数も作り直されるので、最新の関数を ref で持ち、
 * window への登録は使えるかどうかが変わったときだけにする
 */
export const usePlayerShortcuts = ({ disabled, ...handlers }: Handlers & { disabled: boolean }) => {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (disabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        latest.current.onStep(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        latest.current.onToggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled])
}
