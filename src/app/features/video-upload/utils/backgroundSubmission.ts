/**
 * 提出（動画の変換・送信と、提出の確定）を、フォームの画面の外で進めるための置き場
 *
 * フォームを閉じたり、アプリの中で別の画面へ移ったりしても、始めた提出は最後まで進める。
 * 進み具合はここに集め、生徒の画面の共通部分（レイアウト）に出す。
 * タブやブラウザを閉じると止まる（ブラウザの外で送り続ける手段はない）
 *
 * React・DOM に依存しない（購読は useSyncExternalStore から使う）
 */

export type SubmissionStep = 'converting' | 'uploading' | 'submitting'

export type BackgroundSubmissionState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{
      kind: 'running'
      threadId: string
      step: SubmissionStep
      /** 何本目を扱っているか（1から） */
      videoNumber: number
      videoCount: number
      /** いまの段階の進み具合（0〜1） */
      progress: number
    }>
  | Readonly<{ kind: 'done'; threadId: string }>
  | Readonly<{ kind: 'error'; threadId: string; message: string }>

/** 提出を進める関数に渡す、進み具合の知らせ口 */
export type ReportProgress = (
  progress: Readonly<{
    step: SubmissionStep
    videoNumber: number
    progress: number
  }>
) => void

export type SubmissionOutcome = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>

export type SubmissionJob = Readonly<{
  threadId: string
  videoCount: number
  run: (report: ReportProgress) => Promise<SubmissionOutcome>
}>

const IDLE: BackgroundSubmissionState = { kind: 'idle' }

let state: BackgroundSubmissionState = IDLE
const listeners = new Set<() => void>()

const setState = (next: BackgroundSubmissionState) => {
  state = next
  for (const listener of listeners) listener()
}

export const getBackgroundSubmission = (): BackgroundSubmissionState => state

/** サーバーで描くときは、いつも何もしていない */
export const getServerBackgroundSubmission = (): BackgroundSubmissionState => IDLE

export const subscribeBackgroundSubmission = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const isSubmissionRunning = (): boolean => state.kind === 'running'

const FALLBACK_MESSAGE = '送信に失敗しました。通信のよい場所でもう一度お試しください'

/**
 * 提出を始める。すでに別の提出を進めているときは始めず false を返す
 * （同時に送ると、スマホの回線でどちらも遅くなる）
 */
export const startBackgroundSubmission = (job: SubmissionJob): boolean => {
  if (state.kind === 'running') return false
  const { threadId, videoCount } = job
  setState({
    kind: 'running',
    threadId,
    step: 'converting',
    videoNumber: 1,
    videoCount,
    progress: 0,
  })
  void job
    .run(({ step, videoNumber, progress }) =>
      setState({ kind: 'running', threadId, step, videoNumber, videoCount, progress })
    )
    .catch((): SubmissionOutcome => ({ ok: false, message: FALLBACK_MESSAGE }))
    .then((outcome) =>
      setState(
        outcome.ok
          ? { kind: 'done', threadId }
          : { kind: 'error', threadId, message: outcome.message }
      )
    )
  return true
}

/** 終わった・失敗した知らせを消す（進めている途中は消さない） */
export const dismissBackgroundSubmission = (): void => {
  if (state.kind === 'running') return
  setState(IDLE)
}
