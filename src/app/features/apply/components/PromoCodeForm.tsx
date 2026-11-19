'use client'

import { useEffect, useId, useRef } from 'react'
import { Button, textButtonClass } from '@/app/components/ui/Button'
import { inputClass } from '@/app/components/ui/fieldStyles'
import type { ResolveMonitorCodeError } from '@/server/features/monitor/application/dto/MonitorCodeUse.dto'

/** プロモコードが使えない理由の言い方 */
const CODE_ERROR_TEXT = {
  code_not_found: 'プロモコードが見つかりません。もう一度確かめてください',
  code_stopped: 'このプロモコードの募集は終わりました',
  code_expired: 'このプロモコードは期限が切れています',
  code_full: 'このプロモコードの募集は、定員に達しました',
  already_monitor: 'このコーチのモニターには、すでに申し込んでいます',
} as const satisfies Record<ResolveMonitorCodeError, string>

type Props = {
  /** 入れたコード（URL の ?code=）。入れていなければ null */
  code: string | null
  /** 入れたコードが使えないとき、その理由 */
  error: ResolveMonitorCodeError | null
  /** 使えるコードを入れているか（入れていれば、外すリンクを出す） */
  applied: boolean
  /** 申し込みの画面の URL（コードを外すときに戻る先） */
  basePath: string
}

/**
 * プロモコードの入力。コーチから聞いた人だけが使うので、目立たない文字のボタンから開く。
 * 入れると同じ画面を ?code= 付きで開き直し、使えるコードならプランの代わりにモニターの1レッスンが出る。
 * 使えないコードだったときは、理由と一緒に開いた状態で出す
 */
export const PromoCodeForm = ({ code, error, applied, basePath }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (error) dialogRef.current?.showModal()
  }, [error])

  if (applied) {
    return (
      <p className="text-caption text-muted">
        プロモコード {code} を使っています。
        <a href={basePath} className="text-ink ml-1 underline">
          使わずに申し込む
        </a>
      </p>
    )
  }

  return (
    <>
      <div className="text-right">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className={textButtonClass()}
        >
          プロモコードをお持ちの方
        </button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="rounded-card m-auto w-[calc(100%-2rem)] max-w-sm bg-white p-6 shadow-lg backdrop:bg-black/40"
      >
        <form method="get" className="space-y-4">
          <h2 id={titleId} className="text-heading">
            プロモコード
          </h2>
          <p className="text-muted text-sm">コーチから聞いたコードを入れてください。</p>
          <input
            name="code"
            defaultValue={code ?? ''}
            required
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="例：ABCD2345"
            aria-label="プロモコード"
            className={`${inputClass} font-mono uppercase`}
          />
          {error && (
            <p role="alert" className="text-danger text-sm">
              {CODE_ERROR_TEXT[error]}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
              className="flex-1"
            >
              やめる
            </Button>
            <Button type="submit" className="flex-1">
              使う
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
