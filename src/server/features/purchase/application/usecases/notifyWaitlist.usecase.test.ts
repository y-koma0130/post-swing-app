import { describe, expect, it, vi } from 'vitest'
import { notifyWaitlist } from './notifyWaitlist.usecase'

type Deps = Parameters<typeof notifyWaitlist>[1]

const now = new Date('2026-11-16T19:00:00Z')

const setup = (
  coaches: Array<{ coachUserId: string; openSlots: number }>,
  waiting: Record<string, string[]>
) => {
  const notifyWaitlistOpened = vi.fn<Deps['notifyWaitlistOpened']>(async () => undefined)
  const markWaitlistNotified = vi.fn<Deps['markWaitlistNotified']>(async () => undefined)
  const findWaitingStudents = vi.fn<Deps['findWaitingStudents']>(async (coachUserId, limit) =>
    (waiting[coachUserId] ?? []).slice(0, limit)
  )
  const deps: Deps = {
    findCoachesWithOpenSlots: async () => coaches,
    findWaitingStudents,
    notifyWaitlistOpened,
    markWaitlistNotified,
  }
  return { deps, notifyWaitlistOpened, markWaitlistNotified, findWaitingStudents }
}

describe('notifyWaitlist', () => {
  it('空きの数だけ、古い順に知らせて記録する', async () => {
    const { deps, notifyWaitlistOpened, markWaitlistNotified } = setup(
      [{ coachUserId: 'coach-1', openSlots: 2 }],
      { 'coach-1': ['s1', 's2', 's3'] }
    )
    expect(await notifyWaitlist({ now }, deps)).toEqual({ ok: true, value: { notified: 2 } })
    expect(notifyWaitlistOpened.mock.calls.map(([input]) => input.studentUserId)).toEqual([
      's1',
      's2',
    ])
    expect(markWaitlistNotified).toHaveBeenCalledWith('coach-1', ['s1', 's2'], now)
  })

  it('空きがなければ誰にも知らせない', async () => {
    const { deps, notifyWaitlistOpened, findWaitingStudents } = setup(
      [{ coachUserId: 'coach-1', openSlots: 0 }],
      { 'coach-1': ['s1'] }
    )
    expect(await notifyWaitlist({ now }, deps)).toEqual({ ok: true, value: { notified: 0 } })
    expect(findWaitingStudents).not.toHaveBeenCalled()
    expect(notifyWaitlistOpened).not.toHaveBeenCalled()
  })

  it('キャンセル待ちがいなければ記録もしない', async () => {
    const { deps, markWaitlistNotified } = setup([{ coachUserId: 'coach-1', openSlots: 3 }], {})
    await notifyWaitlist({ now }, deps)
    expect(markWaitlistNotified).not.toHaveBeenCalled()
  })
})
