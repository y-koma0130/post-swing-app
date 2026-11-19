import { describe, expect, it, vi } from 'vitest'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { localDateSchema } from '@/server/utils/localDate'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { runThreadMaintenance } from './runThreadMaintenance.usecase'

type Deps = Parameters<typeof runThreadMaintenance>[1]
/** 日本時間 12/16 4:00 */
const now = new Date('2026-12-15T19:00:00Z')

const thread = (id: string, replied: boolean[]): Thread => ({
  id: threadIdSchema.parse(id),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップ',
  status: 'waiting_student',
  startedAt: new Date('2026-11-14T00:00:00Z'),
  expiresAt: new Date('2026-12-14T00:00:00Z'),
  closedAt: null,
  requestedAt: null,
  submissions: replied.map((r, i) => ({
    id: `${id}-s${i}`,
    submittedAt: now,
    note: '',
    videos: [{ id: `${id}-v${i}`, angle: 'front' as const }],
    replied: r,
  })),
  messages: [],
})

const absence = (start: string, end: string): CoachAbsence => ({
  id: start,
  coachUserId: 'coach-1',
  startDate: localDateSchema.parse(start),
  endDate: localDateSchema.parse(end),
  note: '',
  pauseNewSignups: false,
})

const setup = (overrides: Partial<Deps> = {}, absences: CoachAbsence[] = []) => {
  const closeThreads = vi.fn<Deps['closeThreads']>(async () => undefined)
  const notifyThreadClosed = vi.fn<Deps['notifyThreadClosed']>(async () => undefined)
  const notifyThreadExpiring = vi.fn<Deps['notifyThreadExpiring']>(async () => undefined)
  const notifyReplyOverdue = vi.fn<Deps['notifyReplyOverdue']>(async () => undefined)
  const deleteMediaObject = vi.fn<Deps['deleteMediaObject']>(async () => undefined)
  const markVideosDeleted = vi.fn<Deps['markVideosDeleted']>(async () => undefined)
  const findVideosToDelete = vi.fn<Deps['findVideosToDelete']>(async () => [])
  const findDraftVideosToDelete = vi.fn<Deps['findDraftVideosToDelete']>(async () => [])
  const deleteDraftVideos = vi.fn<Deps['deleteDraftVideos']>(async () => undefined)
  const voidPayment = vi.fn<Deps['voidPayment']>(async () => ({ ok: true, value: null }))
  const saveDecline = vi.fn<Deps['saveDecline']>(async () => undefined)
  const notifyApplicationExpired = vi.fn<Deps['notifyApplicationExpired']>(async () => undefined)
  const deleteDraftThreads = vi.fn<Deps['deleteDraftThreads']>(async () => undefined)
  const deps: Deps = {
    findAbsencesForCoaches: async () => new Map([['coach-1', absences]]),
    findExpiredOpenThreads: async () => [],
    closeThreads,
    notifyThreadClosed,
    findOpenThreadsExpiringBy: async () => [],
    notifyThreadExpiring,
    findUnrepliedSubmissionsSince: async () => [],
    notifyReplyOverdue,
    findVideosToDelete,
    deleteMediaObject,
    markVideosDeleted,
    findDraftVideosToDelete,
    deleteDraftVideos,
    findExpiredApplications: async () => [],
    voidPayment,
    saveDecline,
    notifyApplicationExpired,
    findDraftThreadsToDelete: async () => [],
    deleteDraftThreads,
    ...overrides,
  }
  return {
    deps,
    notifyThreadClosed,
    voidPayment,
    saveDecline,
    notifyApplicationExpired,
    deleteDraftThreads,
    closeThreads,
    notifyThreadExpiring,
    notifyReplyOverdue,
    deleteMediaObject,
    markVideosDeleted,
    findVideosToDelete,
    findDraftVideosToDelete,
    deleteDraftVideos,
  }
}

describe('runThreadMaintenance', () => {
  it('期限切れで、すべて添削済みのレッスンだけを終了し、生徒にレビューをお願いする', async () => {
    const { deps, closeThreads, notifyThreadClosed } = setup({
      findExpiredOpenThreads: async () => [
        thread('done', [true, true]),
        thread('pending', [true, false]),
        thread('empty', []),
      ],
    })
    const result = await runThreadMaintenance({ now }, deps)
    expect(closeThreads).toHaveBeenCalledWith(['done', 'empty'], now)
    expect(notifyThreadClosed.mock.calls).toEqual([
      [{ threadId: 'done', studentUserId: 'student-1' }],
      [{ threadId: 'empty', studentUserId: 'student-1' }],
    ])
    expect(result).toEqual({
      ok: true,
      value: {
        closed: 2,
        reminded: 0,
        overdue: 0,
        deletedVideos: 0,
        deletedDrafts: 0,
        expiredApplications: 0,
        deletedDraftThreads: 0,
      },
    })
  })

  it('保存した期限を過ぎても、コーチの不在の分だけ延びていれば終了しない', async () => {
    const { deps, closeThreads } = setup(
      { findExpiredOpenThreads: async () => [thread('done', [true])] },
      [absence('2026-11-20', '2026-11-23')]
    )
    await runThreadMaintenance({ now }, deps)
    expect(closeThreads).not.toHaveBeenCalled()
  })

  it('実際の期限まで2〜3日のレッスンに知らせる（不在で延びた期限で数える）', async () => {
    const base = {
      coachUserId: 'coach-1',
      studentUserId: 's1',
      startedAt: new Date('2026-11-18T19:00:00Z'),
      expiresAt: new Date('2026-12-18T19:00:00Z'),
    }
    const { deps, notifyThreadExpiring } = setup({
      findOpenThreadsExpiringBy: async () => [
        // 期限は日本時間 12/19 4:00 → 2〜3日後なので知らせる
        { ...base, id: 't1' },
        // 保存した期限は同じだが、不在で4日延びるので、まだ知らせない
        { ...base, id: 't2', coachUserId: 'coach-2' },
      ],
      findAbsencesForCoaches: async () =>
        new Map([
          ['coach-1', []],
          ['coach-2', [absence('2026-11-20', '2026-11-23')]],
        ]),
    })
    await runThreadMaintenance({ now }, deps)
    expect(notifyThreadExpiring.mock.calls).toEqual([[{ threadId: 't1', studentUserId: 's1' }]])
  })

  it('添削の期限（48時間）を、この1日で過ぎた提出のコーチに1回だけ知らせる', async () => {
    const { deps, notifyReplyOverdue } = setup({
      findUnrepliedSubmissionsSince: async () => [
        // 日本時間 12/14 10:00 に届いた → 期限 12/16 10:00 → まだ
        {
          threadId: 'later',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-14T01:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: null,
        },
        // 12/13 20:00・21:00 に届いた → 期限 12/15 20:00・21:00 → この1日で過ぎた（2回分でも1回）
        {
          threadId: 'due',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-13T11:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: null,
        },
        {
          threadId: 'due',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-13T12:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: null,
        },
        // 12/12 に届いた → 期限はきのうより前で、もう知らせた
        {
          threadId: 'old',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-12T01:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: null,
        },
      ],
    })
    const result = await runThreadMaintenance({ now }, deps)
    expect(notifyReplyOverdue.mock.calls).toEqual([[{ threadId: 'due', coachUserId: 'coach-1' }]])
    expect(result.ok && result.value.overdue).toBe(1)
  })

  it('撮り直しを待っているあいだは知らせず、撮り直しが届いた時点から48時間で数える', async () => {
    const { deps, notifyReplyOverdue } = setup({
      findUnrepliedSubmissionsSince: async () => [
        // 期限は過ぎているが、撮り直しを待っている → 知らせない
        {
          threadId: 'waiting',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-13T11:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: true,
          lastRetakeClosedAt: null,
        },
        // 12/13 20:00 に届き、12/14 22:00 に撮り直しが届いた → 期限 12/16 22:00 → まだ
        {
          threadId: 'resent',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-13T11:00:00Z'),
          threadStartedAt: new Date('2026-11-01T00:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: new Date('2026-12-14T13:00:00Z'),
        },
      ],
    })
    await runThreadMaintenance({ now }, deps)
    expect(notifyReplyOverdue).not.toHaveBeenCalled()
  })

  it('不在中に届いた提出は、再開日から48時間で数える', async () => {
    const { deps, notifyReplyOverdue } = setup(
      {
        findUnrepliedSubmissionsSince: async () => [
          {
            threadId: 't1',
            coachUserId: 'coach-1',
            submittedAt: new Date('2026-12-10T01:00:00Z'),
            threadStartedAt: new Date('2026-11-01T00:00:00Z'),
            retakeOpen: false,
            lastRetakeClosedAt: null,
          },
        ],
      },
      // 12/10〜12/13 不在 → 再開 12/14 0:00 → 期限 12/16 0:00（日本時間）→ この1日で過ぎた
      [absence('2026-12-10', '2026-12-13')]
    )
    await runThreadMaintenance({ now }, deps)
    expect(notifyReplyOverdue).toHaveBeenCalledWith({ threadId: 't1', coachUserId: 'coach-1' })
  })

  it('終了から90日たった動画を R2 から消し、消したと記録する', async () => {
    const { deps, deleteMediaObject, markVideosDeleted, findVideosToDelete } = setup()
    findVideosToDelete.mockResolvedValue([{ id: 'v1', r2Key: 'videos/t/v1' }])
    await runThreadMaintenance({ now }, deps)
    expect(findVideosToDelete).toHaveBeenCalledWith(new Date('2026-09-16T19:00:00Z'))
    expect(deleteMediaObject).toHaveBeenCalledWith('videos/t/v1')
    expect(markVideosDeleted).toHaveBeenCalledWith(['v1'], now)
  })

  it('24時間たっても提出に使われなかった動画（下書き）を R2 と記録から消す', async () => {
    const { deps, deleteMediaObject, findDraftVideosToDelete, deleteDraftVideos } = setup()
    findDraftVideosToDelete.mockResolvedValue([{ id: 'd1', r2Key: 'videos/t/d1' }])
    const result = await runThreadMaintenance({ now }, deps)
    expect(findDraftVideosToDelete).toHaveBeenCalledWith(new Date('2026-12-14T19:00:00Z'))
    expect(deleteMediaObject).toHaveBeenCalledWith('videos/t/d1')
    expect(deleteDraftVideos).toHaveBeenCalledWith(['d1'])
    expect(result.ok && result.value.deletedDrafts).toBe(1)
  })

  it('48時間たっても決まらない申し込みは、仮押さえを外して断った扱いにし、生徒に知らせる', async () => {
    const { deps, voidPayment, saveDecline, notifyApplicationExpired } = setup({
      findExpiredApplications: async () => [
        { threadId: 'a1', studentUserId: 's1', purchaseId: 'p1' },
        { threadId: 'a2', studentUserId: 's2', purchaseId: 'p2' },
      ],
    })
    voidPayment.mockImplementation(async (purchaseId) =>
      purchaseId === 'p1' ? { ok: true, value: null } : { ok: false, error: 'stripe_error' }
    )
    const result = await runThreadMaintenance({ now }, deps)
    // 外せなかった a2 は承認待ちのまま残し、翌日にもう一度試す
    expect(saveDecline.mock.calls).toEqual([
      ['a1', { reason: 'expired', message: '', decidedAt: now }],
    ])
    expect(notifyApplicationExpired.mock.calls).toEqual([[{ threadId: 'a1', studentUserId: 's1' }]])
    expect(result.ok && result.value.expiredApplications).toBe(1)
  })

  it('カードを登録しないまま24時間たった下書きは、動画ごと消す', async () => {
    const { deps, deleteMediaObject, deleteDraftThreads } = setup({
      findDraftThreadsToDelete: async () => [
        { threadId: 'd1', videoR2Keys: ['videos/d1/a', 'videos/d1/b'] },
        { threadId: 'd2', videoR2Keys: [] },
      ],
    })
    const result = await runThreadMaintenance({ now }, deps)
    expect(deleteMediaObject).toHaveBeenCalledWith('videos/d1/a')
    expect(deleteMediaObject).toHaveBeenCalledWith('videos/d1/b')
    expect(deleteDraftThreads).toHaveBeenCalledWith(['d1', 'd2'])
    expect(result.ok && result.value.deletedDraftThreads).toBe(2)
  })

  it('返信の遅れは、申し込みを承認した時点から数える', async () => {
    const { deps, notifyReplyOverdue } = setup({
      findUnrepliedSubmissionsSince: async () => [
        // 申し込みで 12/10 に届き、12/14 10:00 に承認 → 期限 12/16 10:00 → まだ
        {
          threadId: 'applied',
          coachUserId: 'coach-1',
          submittedAt: new Date('2026-12-10T01:00:00Z'),
          threadStartedAt: new Date('2026-12-14T01:00:00Z'),
          retakeOpen: false,
          lastRetakeClosedAt: null,
        },
      ],
    })
    await runThreadMaintenance({ now }, deps)
    expect(notifyReplyOverdue).not.toHaveBeenCalled()
  })
})
