import { afterEach, describe, expect, it } from 'vitest'
import {
  dismissBackgroundSubmission,
  getBackgroundSubmission,
  type SubmissionOutcome,
  startBackgroundSubmission,
} from './backgroundSubmission'

/** 外から終わらせられる提出 */
const deferredJob = () => {
  let finish: (outcome: SubmissionOutcome) => void = () => undefined
  let report: Parameters<Parameters<typeof startBackgroundSubmission>[0]['run']>[0] = () =>
    undefined
  const run = (r: typeof report) =>
    new Promise<SubmissionOutcome>((resolve) => {
      report = r
      finish = resolve
    })
  return {
    run,
    report: (...args: Parameters<typeof report>) => report(...args),
    finish: (outcome: SubmissionOutcome) => finish(outcome),
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(async () => {
  await flush()
  dismissBackgroundSubmission()
})

describe('画面の外で進める提出', () => {
  it('進み具合を集め、終わったら done にする', async () => {
    const job = deferredJob()
    expect(startBackgroundSubmission({ threadId: 't1', videoCount: 2, run: job.run })).toBe(true)
    job.report({ step: 'uploading', videoNumber: 2, progress: 0.5 })
    expect(getBackgroundSubmission()).toEqual({
      kind: 'running',
      threadId: 't1',
      step: 'uploading',
      videoNumber: 2,
      videoCount: 2,
      progress: 0.5,
    })
    job.finish({ ok: true })
    await flush()
    expect(getBackgroundSubmission()).toEqual({ kind: 'done', threadId: 't1' })
  })

  it('進めている途中は、ほかの提出を始めない・知らせも消さない', async () => {
    const job = deferredJob()
    startBackgroundSubmission({ threadId: 't1', videoCount: 1, run: job.run })
    expect(startBackgroundSubmission({ threadId: 't2', videoCount: 1, run: job.run })).toBe(false)
    dismissBackgroundSubmission()
    expect(getBackgroundSubmission().kind).toBe('running')
    job.finish({ ok: true })
  })

  it('失敗の文言を残す。例外は共通の文言にする', async () => {
    const failed = deferredJob()
    startBackgroundSubmission({ threadId: 't1', videoCount: 1, run: failed.run })
    failed.finish({ ok: false, message: '動画が大きすぎます' })
    await flush()
    expect(getBackgroundSubmission()).toEqual({
      kind: 'error',
      threadId: 't1',
      message: '動画が大きすぎます',
    })

    dismissBackgroundSubmission()
    startBackgroundSubmission({
      threadId: 't1',
      videoCount: 1,
      run: () => Promise.reject(new Error('network')),
    })
    await flush()
    expect(getBackgroundSubmission()).toMatchObject({ kind: 'error', threadId: 't1' })
  })
})
