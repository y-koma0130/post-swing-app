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
  videos: replied.map((r, i) => ({ id: `${id}-v${i}`, uploadedAt: now, note: '', replied: r })),
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
  const notifyThreadExpiring = vi.fn<Deps['notifyThreadExpiring']>(async () => undefined)
  const notifyReplyOverdue = vi.fn<Deps['notifyReplyOverdue']>(async () => undefined)
  const deleteMediaObject = vi.fn<Deps['deleteMediaObject']>(async () => undefined)
  const markVideosDeleted = vi.fn<Deps['markVideosDeleted']>(async () => undefined)
  const findVideosToDelete = vi.fn<Deps['findVideosToDelete']>(async () => [])
  const deps: Deps = {
    findAbsencesForCoaches: async () => new Map([['coach-1', absences]]),
    findExpiredOpenThreads: async () => [],
    closeThreads,
    findOpenThreadsExpiringBy: async () => [],
    notifyThreadExpiring,
    findUnrepliedVideosSince: async () => [],
    notifyReplyOverdue,
    findVideosToDelete,
    deleteMediaObject,
    markVideosDeleted,
    ...overrides,
  }
  return {
    deps,
    closeThreads,
    notifyThreadExpiring,
    notifyReplyOverdue,
    deleteMediaObject,
    markVideosDeleted,
    findVideosToDelete,
  }
}

describe('runThreadMaintenance', () => {
  it('期限切れで、すべて返信済みのスレッドだけを終了する', async () => {
    const { deps, closeThreads } = setup({
      findExpiredOpenThreads: async () => [
        thread('done', [true, true]),
        thread('pending', [true, false]),
        thread('empty', []),
      ],
    })
    const result = await runThreadMaintenance({ now }, deps)
    expect(closeThreads).toHaveBeenCalledWith(['done', 'empty'], now)
    expect(result).toEqual({
      ok: true,
      value: { closed: 2, reminded: 0, overdue: 0, deletedVideos: 0 },
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

  it('実際の期限まで2〜3日のスレッドに知らせる（不在で延びた期限で数える）', async () => {
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

  it('返信の期限（48時間）を、この1日で過ぎた動画のコーチに1回だけ知らせる', async () => {
    const { deps, notifyReplyOverdue } = setup({
      findUnrepliedVideosSince: async () => [
        // 日本時間 12/14 10:00 に届いた → 期限 12/16 10:00 → まだ
        { threadId: 'later', coachUserId: 'coach-1', uploadedAt: new Date('2026-12-14T01:00:00Z') },
        // 12/13 20:00・21:00 に届いた → 期限 12/15 20:00・21:00 → この1日で過ぎた（2本でも1回）
        { threadId: 'due', coachUserId: 'coach-1', uploadedAt: new Date('2026-12-13T11:00:00Z') },
        { threadId: 'due', coachUserId: 'coach-1', uploadedAt: new Date('2026-12-13T12:00:00Z') },
        // 12/12 に届いた → 期限はきのうより前で、もう知らせた
        { threadId: 'old', coachUserId: 'coach-1', uploadedAt: new Date('2026-12-12T01:00:00Z') },
      ],
    })
    const result = await runThreadMaintenance({ now }, deps)
    expect(notifyReplyOverdue.mock.calls).toEqual([[{ threadId: 'due', coachUserId: 'coach-1' }]])
    expect(result.ok && result.value.overdue).toBe(1)
  })

  it('不在中に届いた動画は、再開日から48時間で数える', async () => {
    const { deps, notifyReplyOverdue } = setup(
      {
        findUnrepliedVideosSince: async () => [
          { threadId: 't1', coachUserId: 'coach-1', uploadedAt: new Date('2026-12-10T01:00:00Z') },
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
})
