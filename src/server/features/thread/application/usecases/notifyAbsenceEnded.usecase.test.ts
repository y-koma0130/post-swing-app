import { describe, expect, it, vi } from 'vitest'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { localDateSchema } from '@/server/utils/localDate'
import { notifyAbsenceEnded } from './notifyAbsenceEnded.usecase'

type Deps = Parameters<typeof notifyAbsenceEnded>[1]

const absence = (id: string, coachUserId: string): CoachAbsence => ({
  id,
  coachUserId,
  startDate: localDateSchema.parse('2026-11-20'),
  endDate: localDateSchema.parse('2026-11-23'),
  note: '',
  pauseNewSignups: false,
})

describe('notifyAbsenceEnded', () => {
  it('前日（日本時間）に終わった不在の件数を、届いたものがあるコーチにだけ知らせる', async () => {
    const findAbsencesEndingOn = vi.fn<Deps['findAbsencesEndingOn']>(async () => [
      absence('a1', 'coach-1'),
      absence('a2', 'coach-2'),
    ])
    const notify = vi.fn<Deps['notifyAbsenceEnded']>(async () => undefined)
    const result = await notifyAbsenceEnded(
      // 日本時間 11/24 9:00
      { now: new Date('2026-11-24T00:00:00Z') },
      {
        findAbsencesEndingOn,
        countAbsenceBacklog: async (id) =>
          id === 'a1' ? { submissionCount: 2, chatCount: 1 } : { submissionCount: 0, chatCount: 0 },
        notifyAbsenceEnded: notify,
      }
    )
    expect(findAbsencesEndingOn).toHaveBeenCalledWith('2026-11-23')
    expect(notify.mock.calls).toEqual([
      [{ coachUserId: 'coach-1', submissionCount: 2, chatCount: 1 }],
    ])
    expect(result).toEqual({ ok: true, value: { notified: 1 } })
  })
})
