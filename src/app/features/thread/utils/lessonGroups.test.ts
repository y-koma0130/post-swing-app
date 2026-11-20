import { describe, expect, it } from 'vitest'
import { groupCoachLessons, groupStudentLessons, replyDueText } from './lessonGroups'

type Row = Parameters<typeof groupStudentLessons>[0][number] & { id: string }

const at = (iso: string) => new Date(iso)
const row = (id: string, patch: Partial<Row>): Row => ({
  id,
  status: 'waiting_coach',
  unread: false,
  retakeOpen: false,
  replyDueAt: null,
  approvalDeadline: null,
  expiresAt: at('2026-12-31T00:00:00Z'),
  finishedAt: null,
  ...patch,
})
const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('groupStudentLessons', () => {
  it('進行中は自分が動くものを先にし、完了は終わった新しい順にする', () => {
    const { active, finished } = groupStudentLessons([
      row('coach-turn', { status: 'waiting_coach' }),
      row('requested', { status: 'requested' }),
      row('read-reply', { status: 'waiting_student' }),
      row('retake', { status: 'waiting_coach', retakeOpen: true }),
      row('new-reply', { status: 'waiting_student', unread: true }),
      row('draft', { status: 'draft' }),
      row('old', { status: 'closed', finishedAt: at('2026-10-01T00:00:00Z') }),
      row('declined', { status: 'declined', finishedAt: at('2026-11-01T00:00:00Z') }),
    ])
    expect(ids(active)).toEqual([
      'draft',
      'new-reply',
      'retake',
      'read-reply',
      'requested',
      'coach-turn',
    ])
    expect(ids(finished)).toEqual(['declined', 'old'])
  })
})

describe('groupCoachLessons', () => {
  it('申し込みは返事の期限が近い順、進行中は添削待ち（目安が近い順）→ 未読 → そのほか', () => {
    const { requested, active, finished } = groupCoachLessons([
      row('req-late', { status: 'requested', approvalDeadline: at('2026-11-22T00:00:00Z') }),
      row('req-soon', { status: 'requested', approvalDeadline: at('2026-11-21T00:00:00Z') }),
      row('chat', { status: 'waiting_student', unread: true }),
      row('quiet', { status: 'waiting_student' }),
      row('due-late', { replyDueAt: at('2026-11-23T00:00:00Z') }),
      row('retake', { retakeOpen: true }),
      row('due-soon', { replyDueAt: at('2026-11-21T00:00:00Z') }),
      row('done', { status: 'closed', finishedAt: at('2026-11-01T00:00:00Z') }),
    ])
    expect(ids(requested)).toEqual(['req-soon', 'req-late'])
    expect(ids(active)).toEqual(['due-soon', 'due-late', 'retake', 'chat', 'quiet'])
    expect(ids(finished)).toEqual(['done'])
  })

  it('下書きはどこにも入れない（コーチには見せない）', () => {
    const groups = groupCoachLessons([row('draft', { status: 'draft' })])
    expect([...groups.requested, ...groups.active, ...groups.finished]).toEqual([])
  })
})

describe('replyDueText', () => {
  const now = at('2026-11-20T00:00:00Z')
  it.each([
    ['2026-11-20T00:30:00Z', 'あと1時間以内', 'soon'],
    ['2026-11-20T05:00:00Z', 'あと5時間', 'soon'],
    ['2026-11-20T20:00:00Z', 'あと20時間', 'normal'],
    ['2026-11-21T06:00:00Z', 'あと1日', 'normal'],
    ['2026-11-19T22:00:00Z', '2時間超過', 'overdue'],
    ['2026-11-19T23:40:00Z', '1時間超過', 'overdue'],
    ['2026-11-18T00:00:00Z', '2日超過', 'overdue'],
  ] as const)('%s → %s', (due, text, urgency) => {
    expect(replyDueText(at(due), now)).toEqual({ text, urgency })
  })
})
