'use client'

import { useEffect, useRef, useState } from 'react'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { saveChartMemoAction } from '@/server/features/student-chart/presentation/actions'

type Props = {
  studentUserId: string
  memo: string
  rows?: number | undefined
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

/** 書くのが止まってから保存するまでの時間 */
const AUTOSAVE_DELAY_MS = 1000

/** カルテのメモ。書くのが止まったら自動で保存する（保存の様子を下に出す） */
export const ChartMemo = ({ studentUserId, memo, rows = 6 }: Props) => {
  const [value, setValue] = useState(memo)
  const [state, setState] = useState<SaveState>('saved')
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(value)

  const save = async (text: string) => {
    timer.current = null
    setState('saving')
    const result = await saveChartMemoAction(studentUserId, text)
    // 保存しているあいだにまた書いていたら、その分はあとで保存する
    if (latest.current !== text) return
    if (result.status === 'error') {
      setState('error')
      setMessage(result.message)
    } else {
      setState('saved')
      setMessage(null)
    }
  }

  // 保存を待っているあいだにページを離れたら、書きかけをその場で保存する
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void saveChartMemoAction(studentUserId, latest.current)
      }
    },
    [studentUserId]
  )

  return (
    <div className="space-y-1">
      <textarea
        aria-label="カルテのメモ"
        value={value}
        rows={rows}
        maxLength={5000}
        placeholder="悩み・体の特徴・目標など。書くと自動で保存します（生徒には見えません）"
        onChange={(event) => {
          const text = event.currentTarget.value
          setValue(text)
          latest.current = text
          setState('dirty')
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => void save(text), AUTOSAVE_DELAY_MS)
        }}
        onBlur={() => {
          if (state !== 'dirty') return
          if (timer.current) clearTimeout(timer.current)
          void save(latest.current)
        }}
        className={inputClass}
      />
      <p
        role="status"
        className={`text-caption ${state === 'error' ? 'text-danger' : 'text-muted'}`}
      >
        {state === 'saving'
          ? '保存しています…'
          : state === 'dirty'
            ? '書いています…'
            : state === 'error'
              ? message
              : '保存済み'}
      </p>
    </div>
  )
}
