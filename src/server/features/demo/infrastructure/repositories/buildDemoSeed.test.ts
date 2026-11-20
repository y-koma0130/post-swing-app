import { describe, expect, it } from 'vitest'
import { DEMO_EMAIL_DOMAIN } from '../../domain/rules'
import { isDemoSampleKey } from '../../domain/services/demoPeriod.service'
import { buildDemoSeed } from './buildDemoSeed'

const now = new Date('2026-11-20T00:00:00Z')
let n = 0
const seed = buildDemoSeed({
  coachUserId: 'coach-1',
  coachName: '山田 太郎',
  slug: 'demo-abc12345',
  tokenHash: 'hash',
  expiresAt: new Date('2026-11-27T00:00:00Z'),
  now,
  newId: () => `id-${++n}`,
  monitorCode: 'ABCD2345',
})

describe('buildDemoSeed', () => {
  it('いろいろな状態のレッスンをそろえる（承認待ち・添削待ち2件・レッスン中・完了2件・お断り）', () => {
    const statuses = seed.threads.map((t) => t.status).toSorted()
    expect(statuses).toEqual([
      'closed',
      'closed',
      'declined',
      'requested',
      'waiting_coach',
      'waiting_coach',
      'waiting_student',
    ])
  })

  it('デモのコーチとして印を付け、期限とトークンのハッシュを持つ', () => {
    expect(seed.coach).toMatchObject({
      userId: 'coach-1',
      demoExpiresAt: new Date('2026-11-27T00:00:00Z'),
      demoTokenHash: 'hash',
    })
  })

  it('アカウントはすべて届かないデモ用のアドレスにする（通知が本物に届かない）', () => {
    for (const u of seed.users) expect(u.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).toBe(true)
  })

  it('動画はすべてお手本の動画を参照する（デモを消しても消さない）', () => {
    expect(seed.videos.length).toBeGreaterThan(0)
    for (const v of seed.videos) expect(isDemoSampleKey(v.r2Key)).toBe(true)
  })

  it('行どうしの参照がつながっている（レッスン→申し込み、提出→レッスン、添削→提出）', () => {
    const purchaseIds = new Set(seed.purchases.map((p) => p.id))
    const threadIds = new Set(seed.threads.map((t) => t.id))
    const submissionIds = new Set(seed.submissions.map((s) => s.id))
    const userIds = new Set(seed.users.map((u) => u.id))
    for (const t of seed.threads) {
      expect(purchaseIds.has(t.purchaseId)).toBe(true)
      expect(userIds.has(t.studentUserId)).toBe(true)
    }
    for (const s of seed.submissions) expect(threadIds.has(s.threadId)).toBe(true)
    for (const r of seed.replies) expect(submissionIds.has(r.submissionId)).toBe(true)
    for (const v of seed.videos) expect(threadIds.has(v.threadId)).toBe(true)
  })

  it('添削待ちは、まだ添削していない提出がある', () => {
    const replied = new Set(seed.replies.map((r) => r.submissionId))
    for (const t of seed.threads.filter((x) => x.status === 'waiting_coach')) {
      const pending = seed.submissions.filter((s) => s.threadId === t.id && !replied.has(s.id))
      expect(pending.length).toBe(1)
    }
  })
})
