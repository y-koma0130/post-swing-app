import { describe, expect, it, vi } from 'vitest'
import type { StudentChartDto } from '../dto/StudentChart.dto'
import { addChartEntry } from './addChartEntry.usecase'
import { deleteChartEntry } from './deleteChartEntry.usecase'
import { saveChart } from './saveChart.usecase'
import { viewChartForThread } from './viewChartForThread.usecase'
import { viewStudentChart } from './viewStudentChart.usecase'

const coach = { userId: 'coach-1', name: '' }
const otherCoach = { userId: 'coach-2', name: '' }
const student = { userId: 'student-1', name: '' }
const now = new Date('2026-11-19T00:00:00Z')
const chart: StudentChartDto = {
  studentUserId: 'student-1',
  studentName: '佐藤',
  memo: '右ひざが流れる',
  tags: ['スライス'],
  updatedAt: now,
  entries: [],
  threads: [],
  drills: [],
}
/** coach-1 と student-1 だけがレッスンでつながっている */
const hasLessonWith = async (coachUserId: string, studentUserId: string) =>
  coachUserId === 'coach-1' && studentUserId === 'student-1'
const findThreadPair = async (threadId: string) =>
  threadId === 'thread-1' ? { coachUserId: 'coach-1', studentUserId: 'student-1' } : null

describe('viewStudentChart', () => {
  const deps = { hasLessonWith, findStudentChart: async () => chart }

  it('レッスンがあったコーチ本人は見られる', async () => {
    expect(await viewStudentChart({ actor: coach, studentUserId: 'student-1' }, deps)).toEqual({
      ok: true,
      value: chart,
    })
  })

  it('ほかのコーチや、生徒本人は見られない', async () => {
    for (const actor of [otherCoach, student]) {
      expect(await viewStudentChart({ actor, studentUserId: 'student-1' }, deps)).toEqual({
        ok: false,
        error: 'not_found',
      })
    }
  })

  it('カルテが見つからなければ not_found', async () => {
    expect(
      await viewStudentChart(
        { actor: coach, studentUserId: 'student-1' },
        { hasLessonWith, findStudentChart: async () => null }
      )
    ).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('viewChartForThread', () => {
  const deps = { findThreadPair, findStudentChart: async () => chart }

  it('レッスンの担当のコーチだけが見られる', async () => {
    expect(await viewChartForThread({ actor: coach, threadId: 'thread-1' }, deps)).toEqual({
      ok: true,
      value: chart,
    })
    expect(await viewChartForThread({ actor: student, threadId: 'thread-1' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await viewChartForThread({ actor: otherCoach, threadId: 'thread-1' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})

describe('viewChartForThread（カルテなし）', () => {
  it('カルテが見つからなければ not_found', async () => {
    expect(
      await viewChartForThread(
        { actor: coach, threadId: 'thread-1' },
        { findThreadPair, findStudentChart: async () => null }
      )
    ).toEqual({ ok: false, error: 'not_found' })
  })

  it('申し込みの下書き（組がない）なら not_found', async () => {
    expect(
      await viewChartForThread(
        { actor: coach, threadId: 'thread-draft' },
        { findThreadPair, findStudentChart: async () => chart }
      )
    ).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('saveChart', () => {
  it('メモとタグを書ける（タグは同じものをまとめる）', async () => {
    const save = vi.fn(async () => undefined)
    const result = await saveChart(
      { actor: coach, studentUserId: 'student-1', tags: ['初心者', ' 初心者'], now },
      { hasLessonWith, saveChart: save }
    )
    expect(result).toEqual({ ok: true, value: { tags: ['初心者'] } })
    expect(save).toHaveBeenCalledWith({
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      memo: undefined,
      tags: ['初心者'],
      updatedAt: now,
    })
  })

  it('レッスンのない生徒のカルテは書けない', async () => {
    const save = vi.fn(async () => undefined)
    expect(
      await saveChart(
        { actor: otherCoach, studentUserId: 'student-1', memo: 'x', now },
        { hasLessonWith, saveChart: save }
      )
    ).toEqual({ ok: false, error: 'not_found' })
    expect(save).not.toHaveBeenCalled()
  })

  it('長すぎるメモは書けない', async () => {
    const save = vi.fn(async () => undefined)
    expect(
      await saveChart(
        { actor: coach, studentUserId: 'student-1', memo: 'あ'.repeat(5001), now },
        { hasLessonWith, saveChart: save }
      )
    ).toEqual({ ok: false, error: 'invalid_memo' })
    expect(save).not.toHaveBeenCalled()
  })

  it('タグが多すぎる・空のタグは書けない', async () => {
    const save = vi.fn(async () => undefined)
    const run = (tags: string[]) =>
      saveChart(
        { actor: coach, studentUserId: 'student-1', tags, now },
        { hasLessonWith, saveChart: save }
      )
    expect(await run(Array.from({ length: 11 }, (_, i) => `タグ${i}`))).toEqual({
      ok: false,
      error: 'invalid_tags',
    })
    expect(await run(['  '])).toEqual({ ok: false, error: 'invalid_tags' })
    expect(save).not.toHaveBeenCalled()
  })
})

describe('addChartEntry', () => {
  const deps = () => ({
    hasLessonWith,
    findThreadPair,
    saveEntry: vi.fn(async () => undefined),
    generateId: () => 'entry-1',
  })

  it('記録を足せる。レッスンを付けるなら、そのコーチと生徒のレッスンだけ', async () => {
    const d = deps()
    expect(
      await addChartEntry(
        { actor: coach, studentUserId: 'student-1', body: ' 右ひざ ', threadId: 'thread-1', now },
        d
      )
    ).toEqual({ ok: true, value: { entryId: 'entry-1' } })
    expect(d.saveEntry).toHaveBeenCalledWith({
      id: 'entry-1',
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      body: '右ひざ',
      threadId: 'thread-1',
      createdAt: now,
    })
    expect(
      await addChartEntry(
        { actor: coach, studentUserId: 'student-1', body: 'x', threadId: 'thread-9', now },
        deps()
      )
    ).toEqual({ ok: false, error: 'not_found' })
  })

  it('ほかの生徒のレッスンや、ほかのコーチのレッスンは付けられない', async () => {
    const pairs: Record<string, { coachUserId: string; studentUserId: string }> = {
      'thread-other-student': { coachUserId: 'coach-1', studentUserId: 'student-2' },
      'thread-other-coach': { coachUserId: 'coach-2', studentUserId: 'student-1' },
    }
    for (const threadId of Object.keys(pairs)) {
      const d = { ...deps(), findThreadPair: async (id: string) => pairs[id] ?? null }
      expect(
        await addChartEntry(
          { actor: coach, studentUserId: 'student-1', body: 'x', threadId, now },
          d
        )
      ).toEqual({ ok: false, error: 'not_found' })
      expect(d.saveEntry).not.toHaveBeenCalled()
    }
  })

  it('レッスンのない生徒には書けない。空の記録も書けない', async () => {
    expect(
      await addChartEntry(
        { actor: otherCoach, studentUserId: 'student-1', body: 'x', threadId: null, now },
        deps()
      )
    ).toEqual({ ok: false, error: 'not_found' })
    expect(
      await addChartEntry(
        { actor: coach, studentUserId: 'student-1', body: '  ', threadId: null, now },
        deps()
      )
    ).toEqual({ ok: false, error: 'invalid_body' })
  })
})

describe('deleteChartEntry', () => {
  it('書いたコーチ本人だけが消せる', async () => {
    const deleteEntry = vi.fn(async () => undefined)
    const deps = { findEntryOwner: async () => 'coach-1', deleteEntry }
    expect(await deleteChartEntry({ actor: otherCoach, entryId: 'entry-1' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(deleteEntry).not.toHaveBeenCalled()
    expect(await deleteChartEntry({ actor: coach, entryId: 'entry-1' }, deps)).toEqual({
      ok: true,
      value: undefined,
    })
  })

  it('記録がなければ not_found で、消さない', async () => {
    const deleteEntry = vi.fn(async () => undefined)
    expect(
      await deleteChartEntry(
        { actor: coach, entryId: 'unknown' },
        { findEntryOwner: async () => null, deleteEntry }
      )
    ).toEqual({ ok: false, error: 'not_found' })
    expect(deleteEntry).not.toHaveBeenCalled()
  })
})
