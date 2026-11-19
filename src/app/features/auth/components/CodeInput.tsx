'use client'

import { useState } from 'react'

type Props = {
  name: string
  /** 桁数 */
  length: number
  /** 桁がそろったとき（自動で送るのに使う） */
  onComplete?: ((code: string) => void) | undefined
  disabled?: boolean | undefined
}

/**
 * 数字のコードの入力欄。1桁ずつの枠に見せる。
 *
 * 実際の入力は、枠の上に重ねた透明な1つの input で受ける。
 * 貼り付け・メールからの自動入力（autocomplete="one-time-code"）・消すのが、ふつうの入力欄と同じように動く
 */
export const CodeInput = ({ name, length, onComplete, disabled }: Props) => {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value.replace(/\D/g, '').slice(0, length)
          setValue(next)
          if (next.length === length) onComplete?.(next)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern={`[0-9]{${length}}`}
        maxLength={length}
        required
        autoComplete="one-time-code"
        aria-label={`${length}桁のログインコード`}
        disabled={disabled}
        // 文字とカーソルは見せず、下の枠に1桁ずつ出す。iOS が拡大しないよう文字の大きさは 16px 以上にする
        className="absolute inset-0 h-full w-full cursor-text text-base text-transparent caret-transparent opacity-0"
      />
      <div aria-hidden className="flex justify-between gap-2">
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? ''
          // いま入力する枠（全部埋まったら最後の枠）
          const active = focused && index === Math.min(value.length, length - 1)
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: 桁の位置そのものが鍵
              key={index}
              className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-xl border bg-white text-2xl font-bold transition-colors ${
                active ? 'border-mint ring-mint/30 ring-2' : digit ? 'border-ink/30' : 'border-line'
              }`}
            >
              {digit}
            </span>
          )
        })}
      </div>
    </div>
  )
}
