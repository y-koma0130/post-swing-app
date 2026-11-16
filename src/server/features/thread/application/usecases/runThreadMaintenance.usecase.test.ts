import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { runThreadMaintenance } from './runThreadMaintenance.usecase'

type Deps = Parameters<typeof runThreadMaintenance>[1]
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

const setup = (overrides: Partial<Deps> = {}) => {
  const closeThreads = vi.fn<Deps['closeThreads']>(async () => undefined)
  const notifyThreadExpiring = vi.fn<Deps['notifyThreadExpiring']>(async () => undefined)
  const deleteMediaObject = vi.fn<Deps['deleteMediaObject']>(async () => undefined)
  const markVideosDeleted = vi.fn<Deps['markVideosDeleted']>(async () => undefined)
  const findThreadsExpiringBetween = vi.fn<Deps['findThreadsExpiringBetween']>(async () => [])
  const findVideosToDelete = vi.fn<Deps['findVideosToDelete']>(async () => [])
  const findThreadsWithUnrepliedVideosBetween = vi.fn<
    Deps['findThreadsWithUnrepliedVideosBetween']
  >(async () => [])
  const notifyReplyOverdue = vi.fn<Deps['notifyReplyOverdue']>(async () => undefined)
  const deps: Deps = {
    findExpiredOpenThreads: async () => [],
    closeThreads,
    findThreadsExpiringBetween,
    notifyThreadExpiring,
    findThreadsWithUnrepliedVideosBetween,
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
    deleteMediaObject,
    markVideosDeleted,
    findThreadsExpiringBetween,
    findVideosToDelete,
    findThreadsWithUnrepliedVideosBetween,
    notifyReplyOverdue,
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

  it('期限まで2〜3日のスレッドに知らせる', async () => {
    const { deps, notifyThreadExpiring, findThreadsExpiringBetween } = setup()
    findThreadsExpiringBetween.mockResolvedValue([{ id: 't1', studentUserId: 's1' }])
    await runThreadMaintenance({ now }, deps)
    expect(findThreadsExpiringBetween).toHaveBeenCalledWith(
      new Date('2026-12-17T19:00:00Z'),
      new Date('2026-12-18T19:00:00Z')
    )
    expect(notifyThreadExpiring).toHaveBeenCalledWith({ threadId: 't1', studentUserId: 's1' })
  })

  it('届いて3〜4日返信のない動画があるスレッドのコーチに知らせる', async () => {
    const { deps, notifyReplyOverdue, findThreadsWithUnrepliedVideosBetween } = setup()
    findThreadsWithUnrepliedVideosBetween.mockResolvedValue([{ id: 't1', coachUserId: 'c1' }])
    await runThreadMaintenance({ now }, deps)
    expect(findThreadsWithUnrepliedVideosBetween).toHaveBeenCalledWith(
      new Date('2026-12-11T19:00:00Z'),
      new Date('2026-12-12T19:00:00Z')
    )
    expect(notifyReplyOverdue).toHaveBeenCalledWith({ threadId: 't1', coachUserId: 'c1' })
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
