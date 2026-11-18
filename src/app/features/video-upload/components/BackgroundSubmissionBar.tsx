'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useBackgroundSubmission } from '../hooks/useBackgroundSubmission'
import { dismissBackgroundSubmission, type SubmissionStep } from '../utils/backgroundSubmission'
import { Progress } from './Progress'

const STEP_LABEL: Record<SubmissionStep, string> = {
  converting: '変換中',
  uploading: '送信中',
  submitting: '提出しています',
}

/**
 * 画面の外で進めている提出の進み具合（生徒の画面の上に出す）
 *
 * - 送っているあいだに別の画面へ移っても、ここで進み具合と結果が分かる
 * - タブを閉じる・再読み込みすると止まるので、そのときはブラウザの確認を出す
 * - 終わったら、いま見ている画面を読み直す（スレッドに提出が出る）
 */
export const BackgroundSubmissionBar = () => {
  const state = useBackgroundSubmission()
  const router = useRouter()
  const pathname = usePathname()
  const running = state.kind === 'running'

  useEffect(() => {
    if (!running) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  const done = state.kind === 'done'
  useEffect(() => {
    if (!done) return
    router.refresh()
  }, [done, router])

  if (state.kind === 'idle') return null

  const threadPath = `/t/${state.threadId}`
  const onThread = pathname === threadPath

  if (state.kind === 'running') {
    const count = state.videoCount > 1 ? `（${state.videoNumber}/${state.videoCount}本目）` : ''
    return (
      <div role="status" className="bg-mint-soft sticky top-0 z-40 space-y-1 px-6 py-3">
        {state.step === 'submitting' ? (
          <p className="text-caption text-ink">提出しています…</p>
        ) : (
          <Progress value={state.progress} label={`動画を${STEP_LABEL[state.step]}${count}`} />
        )}
        <p className="text-caption text-muted">
          ほかの画面に移っても送信は続きます。終わるまでタブは閉じないでください
        </p>
      </div>
    )
  }

  const tone = state.kind === 'done' ? 'bg-mint-soft text-ink' : 'bg-danger-soft text-danger'
  return (
    <div
      role={state.kind === 'error' ? 'alert' : 'status'}
      className={`${tone} sticky top-0 z-40 flex items-start justify-between gap-3 px-6 py-3 text-sm`}
    >
      <p className="min-w-0">
        {state.kind === 'done' ? '動画を提出しました。' : `${state.message}`}
        {!onThread && (
          <>
            {' '}
            <Link href={threadPath} className="font-semibold underline">
              スレッドを見る
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={dismissBackgroundSubmission}
        className="text-muted hover:text-ink shrink-0"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  )
}
