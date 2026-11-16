import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { CoachAbsence } from '../../domain/values/CoachAbsence'
import { deleteAbsence } from './deleteAbsence.usecase'
import { saveAbsence } from './saveAbsence.usecase'
import { setDelayFlag } from './setDelayFlag.usecase'

const d = (value: string) => localDateSchema.parse(value)
const now = new Date('2026-11-16T12:00:00+09:00')
const actor = { userId: 'coach-1', name: '' }
const existing: CoachAbsence = {
  id: 'a1',
  coachUserId: 'coach-1',
  startDate: d('2026-11-20'),
  endDate: d('2026-11-23'),
  note: '',
  pauseNewSignups: false,
}
const input = {
  startDate: d('2026-11-25'),
  endDate: d('2026-11-26'),
  note: '試合のため',
  pauseNewSignups: true,
}

type SaveDeps = Parameters<typeof saveAbsence>[1]
const saveSetup = (isCoach = true) => {
  const save = vi.fn<SaveDeps['saveAbsence']>(async () => undefined)
  const deps: SaveDeps = {
    isCoach: async () => isCoach,
    findAbsences: async () => [existing],
    saveAbsence: save,
    generateId: () => 'new-id',
  }
  return { deps, save }
}

describe('saveAbsence', () => {
  it('追加する', async () => {
    const { deps, save } = saveSetup()
    expect(await saveAbsence({ actor, absenceId: null, input, now }, deps)).toEqual({
      ok: true,
      value: { absenceId: 'new-id' },
    })
    expect(save).toHaveBeenCalledWith({ ...input, id: 'new-id', coachUserId: 'coach-1' }, now)
  })

  it('編集では、自分自身との重なりは数えない', async () => {
    const { deps, save } = saveSetup()
    const edited = { ...input, startDate: d('2026-11-21'), endDate: d('2026-11-24') }
    expect((await saveAbsence({ actor, absenceId: 'a1', input: edited, now }, deps)).ok).toBe(true)
    expect(save.mock.calls[0]?.[0].id).toBe('a1')
  })

  it('ほかの不在と重なる・過去だけ・開始＞終了は保存しない', async () => {
    const { deps, save } = saveSetup()
    const run = (i: typeof input) => saveAbsence({ actor, absenceId: null, input: i, now }, deps)
    expect(await run({ ...input, startDate: d('2026-11-22') })).toEqual({
      ok: false,
      error: 'overlap',
    })
    expect(await run({ ...input, startDate: d('2026-11-01'), endDate: d('2026-11-02') })).toEqual({
      ok: false,
      error: 'past',
    })
    expect(await run({ ...input, startDate: d('2026-11-27') })).toEqual({
      ok: false,
      error: 'invalid_range',
    })
    expect(save).not.toHaveBeenCalled()
  })

  it('コーチでない・他人の不在の編集は not_found', async () => {
    expect(
      await saveAbsence({ actor, absenceId: null, input, now }, saveSetup(false).deps)
    ).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await saveAbsence({ actor, absenceId: 'other', input, now }, saveSetup().deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})

describe('deleteAbsence', () => {
  it('自分の不在だけ消せる', async () => {
    const remove = vi.fn(async () => undefined)
    const deps = { findAbsences: async () => [existing], deleteAbsence: remove }
    expect(await deleteAbsence({ actor, absenceId: 'a1' }, deps)).toEqual({
      ok: true,
      value: undefined,
    })
    expect(await deleteAbsence({ actor, absenceId: 'x' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(remove).toHaveBeenCalledTimes(1)
  })
})

describe('setDelayFlag', () => {
  it('立てるときは日時を、下ろすときは null を保存する', async () => {
    const saveDelayFlag = vi.fn(async () => undefined)
    const deps = { isCoach: async () => true, saveDelayFlag }
    await setDelayFlag({ actor, on: true, now }, deps)
    await setDelayFlag({ actor, on: false, now }, deps)
    expect(saveDelayFlag.mock.calls).toEqual([
      ['coach-1', now],
      ['coach-1', null],
    ])
  })
})
