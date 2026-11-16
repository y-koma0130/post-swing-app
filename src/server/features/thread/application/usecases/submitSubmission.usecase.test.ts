import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { DraftVideo } from '../../domain/values/Submission'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { submitSubmission } from './submitSubmission.usecase'

type Deps = Parameters<typeof submitSubmission>[1]

const now = new Date('2026-11-14T00:00:00Z')
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: '',
  status: 'waiting_student',
  startedAt: now,
  expiresAt: new Date('2026-12-14T00:00:00Z'),
  closedAt: null,
  submissions: [],
  messages: [],
}
const draft = (id: string, angle: DraftVideo['angle']): DraftVideo => ({
  id,
  threadId: 'thread-1',
  uploaderUserId: 'student-1',
  submissionId: null,
  angle,
})
const drafts = [draft('front-1', 'front'), draft('back-1', 'back')]
const params = {
  actor: { userId: 'student-1', name: '佐藤' },
  threadId: 'thread-1',
  theme: 'トップで右ひざが流れる',
  note: 'ドライバーです',
  videoIds: ['front-1', 'back-1'],
  now,
}

const absentFacts = (start: string, end: string) => ({
  absences: [
    {
      id: 'absence-1',
      coachUserId: 'coach-1',
      startDate: localDateSchema.parse(start),
      endDate: localDateSchema.parse(end),
      note: '',
      pauseNewSignups: false,
    },
  ],
  delayFlagSetAt: null,
})

const setup = (
  t: Thread | null = thread,
  facts: Awaited<ReturnType<Deps['findCoachAvailabilityFacts']>> = {
    absences: [],
    delayFlagSetAt: null,
  }
) => {
  const saveSubmission = vi.fn<Deps['saveSubmission']>(async () => undefined)
  const saveThreadNotice = vi.fn<Deps['saveThreadNotice']>(async () => undefined)
  const notifySubmitted = vi.fn<Deps['notifySubmitted']>(async () => undefined)
  let n = 0
  const deps: Deps = {
    findThread: async () => t,
    findCoachAvailabilityFacts: async () => facts,
    findDraftVideos: async (ids) => drafts.filter((d) => ids.includes(d.id)),
    saveSubmission,
    saveThreadNotice,
    notifySubmitted,
    generateId: () => `id-${++n}`,
  }
  return { deps, saveSubmission, saveThreadNotice, notifySubmitted }
}

describe('submitSubmission', () => {
  it('正面と後方を1回で提出し、テーマを保存し、コーチの番にして知らせる', async () => {
    const { deps, saveSubmission, notifySubmitted, saveThreadNotice } = setup()
    expect(await submitSubmission(params, deps)).toEqual({
      ok: true,
      value: { submissionId: 'id-1' },
    })
    expect(saveSubmission.mock.calls[0]?.[0]).toMatchObject({
      id: 'id-1',
      threadId: 'thread-1',
      videoIds: ['front-1', 'back-1'],
      note: 'ドライバーです',
      theme: 'トップで右ひざが流れる',
      nextStatus: 'waiting_coach',
      sentDuringAbsenceId: null,
    })
    expect(notifySubmitted).toHaveBeenCalledWith({ threadId: 'thread-1', coachUserId: 'coach-1' })
    expect(saveThreadNotice).not.toHaveBeenCalled()
  })

  it('本人の生徒でなければ提出できない', async () => {
    const { deps, saveSubmission } = setup()
    const result = await submitSubmission(
      { ...params, actor: { userId: 'coach-1', name: '' } },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(saveSubmission).not.toHaveBeenCalled()
  })

  it('上限の回数を出したら提出できない（お試しは1回）', async () => {
    const done = {
      id: 's0',
      submittedAt: now,
      note: '',
      videos: [{ id: 'v0', angle: 'front' as const }],
      replied: true,
    }
    const { deps } = setup({ ...thread, planKind: 'trial', submissions: [done] })
    expect(await submitSubmission(params, deps)).toEqual({
      ok: false,
      error: 'submission_limit',
    })
  })

  it('上げていない動画・3本以上は提出できない', async () => {
    const { deps } = setup()
    expect(await submitSubmission({ ...params, videoIds: ['unknown'] }, deps)).toEqual({
      ok: false,
      error: 'invalid_video',
    })
    expect(
      await submitSubmission({ ...params, videoIds: ['front-1', 'back-1', 'x'] }, deps)
    ).toEqual({ ok: false, error: 'too_many_videos' })
  })

  it('不在中に提出すると、どの不在中かを残し、お知らせを出す', async () => {
    const day = now.toISOString().slice(0, 10)
    const { deps, saveSubmission, saveThreadNotice } = setup(thread, absentFacts(day, day))
    await submitSubmission(params, deps)
    expect(saveSubmission.mock.calls[0]?.[0].sentDuringAbsenceId).toBe('absence-1')
    expect(saveThreadNotice.mock.calls[0]?.[0]).toMatchObject({
      threadId: 'thread-1',
      submissionId: 'id-1',
      absenceId: 'absence-1',
    })
  })
})
