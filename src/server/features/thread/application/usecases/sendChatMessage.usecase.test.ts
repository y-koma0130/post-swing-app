import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { sendChatMessage } from './sendChatMessage.usecase'

type Deps = Parameters<typeof sendChatMessage>[1]
const now = new Date('2026-11-20T00:00:00Z')
const message = (from: 'coach' | 'student') => ({
  id: crypto.randomUUID(),
  from,
  body: 'テスト',
  sentAt: now,
  attachment: { kind: 'none' as const },
  quote: null,
})
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップ',
  status: 'waiting_student',
  startedAt: now,
  expiresAt: new Date('2026-12-20T00:00:00Z'),
  closedAt: null,
  requestedAt: null,
  submissions: [
    { id: 's1', submittedAt: now, note: '', videos: [{ id: 'v1', angle: 'front' }], replied: true },
  ],
  messages: [],
}
const student = { userId: 'student-1', name: '佐藤' }
const coach = { userId: 'coach-1', name: '山田' }

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
  t: Thread = thread,
  facts: Awaited<ReturnType<Deps['findCoachAvailabilityFacts']>> = {
    absences: [],
    delayFlagSetAt: null,
  }
) => {
  const saveChatMessage = vi.fn<Deps['saveChatMessage']>(async () => undefined)
  const saveThreadNotice = vi.fn<Deps['saveThreadNotice']>(async () => undefined)
  const saveAbsenceAck = vi.fn<Deps['saveAbsenceAck']>(async () => undefined)
  const notifyChatMessage = vi.fn<Deps['notifyChatMessage']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => t,
    findThreadCards: async () => [{ id: 'c1', submissionId: 's1', position: 'top' }],
    findOwnDrill: async (_coach, drillId) =>
      drillId === 'own'
        ? {
            title: '壁ドリル',
            description: '壁の前で素振り',
            video: { kind: 'upload' as const, videoId: 'dv1' },
          }
        : null,
    findDraftVideo: async (videoId) =>
      videoId === 'coach-video'
        ? {
            id: 'coach-video',
            threadId: 'thread-1',
            uploaderUserId: 'coach-1',
            submissionId: null,
            chatMessageId: null,
            angle: 'other',
          }
        : null,
    checkYoutubeEmbed: async (youtubeId) =>
      youtubeId === 'deletedVid0' ? 'unavailable' : 'playable',
    findCoachAvailabilityFacts: async () => facts,
    saveThreadNotice,
    saveAbsenceAck,
    saveChatMessage,
    notifyChatMessage,
    generateId: () => 'm-1',
  }
  return { deps, saveChatMessage, notifyChatMessage, saveThreadNotice, saveAbsenceAck }
}
const send = (
  actor: typeof student,
  deps: Deps,
  body = '質問です',
  hide = false,
  extra: Partial<Parameters<typeof sendChatMessage>[0]> = {}
) =>
  sendChatMessage(
    {
      actor,
      threadId: 'thread-1',
      body,
      attachment: { kind: 'none' },
      quote: null,
      hideAbsenceNoticeFromNow: hide,
      now,
      ...extra,
    },
    deps
  )

describe('sendChatMessage', () => {
  it('生徒が送っても状態は変えず、コーチに知らせる', async () => {
    const { deps, saveChatMessage, notifyChatMessage } = setup()
    expect((await send(student, deps)).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0]).toMatchObject({
      senderRole: 'student',
      nextStatus: 'waiting_student',
    })
    expect(notifyChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      to: 'coach',
      recipientUserId: 'coach-1',
    })
  })

  it('生徒はレッスン全体で30通まで（お試しは10通）', async () => {
    const sent = (n: number) => Array.from({ length: n }, () => message('student'))
    expect(await send(student, setup({ ...thread, messages: sent(30) }).deps)).toEqual({
      ok: false,
      error: 'limit_reached',
    })
    expect((await send(student, setup({ ...thread, messages: sent(29) }).deps)).ok).toBe(true)
    expect(
      await send(student, setup({ ...thread, planKind: 'trial', messages: sent(10) }).deps)
    ).toEqual({ ok: false, error: 'limit_reached' })
  })

  it('生徒は最初の提出の前には送れない', async () => {
    const { deps } = setup({ ...thread, submissions: [] })
    expect(await send(student, deps)).toEqual({ ok: false, error: 'no_submission' })
  })

  it('コーチは何通でも送れる', async () => {
    const { deps } = setup({
      ...thread,
      messages: Array.from({ length: 40 }, () => message('coach')),
    })
    expect((await send(coach, deps)).ok).toBe(true)
  })

  it('コーチは自分のドリルを写して送れる。ほかのコーチのドリルは送れない', async () => {
    const { deps, saveChatMessage } = setup()
    const sent = await send(coach, deps, '', false, {
      attachment: { kind: 'drill', drillId: 'own' },
    })
    expect(sent.ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0].attachment).toEqual({
      kind: 'drill',
      title: '壁ドリル',
      description: '壁の前で素振り',
      // お手本の動画も写す（ドリルを消しても生徒は見られる）
      video: { kind: 'upload', videoId: 'dv1' },
    })
    expect(
      await send(coach, deps, '', false, { attachment: { kind: 'drill', drillId: 'others' } })
    ).toEqual({ ok: false, error: 'invalid_drill' })
  })

  it('コーチは自分が上げた動画を送れる。生徒は動画を添えられない', async () => {
    const { deps, saveChatMessage } = setup()
    const attachment = { kind: 'video' as const, videoId: 'coach-video' }
    expect((await send(coach, deps, 'お手本です', false, { attachment })).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0].attachment).toEqual(attachment)
    expect(await send(student, deps, '見て', false, { attachment })).toEqual({
      ok: false,
      error: 'attachment_not_allowed',
    })
  })

  it('コーチは YouTube の動画を開始位置つきで送れる。再生できない動画・生徒は送れない', async () => {
    const { deps, saveChatMessage } = setup()
    const attachment = { kind: 'youtube' as const, url: 'https://youtu.be/dQw4w9WgXcQ?t=1m30s' }
    expect((await send(coach, deps, '', false, { attachment })).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0].attachment).toEqual({
      kind: 'youtube',
      youtubeId: 'dQw4w9WgXcQ',
      startSec: 90,
    })
    expect(
      await send(coach, deps, '', false, {
        attachment: { kind: 'youtube', url: 'https://youtu.be/deletedVid0' },
      })
    ).toEqual({ ok: false, error: 'youtube_unavailable' })
    expect(
      await send(coach, deps, '', false, {
        attachment: { kind: 'youtube', url: 'https://example.com/' },
      })
    ).toEqual({ ok: false, error: 'invalid_youtube' })
    expect(await send(student, deps, '見て', false, { attachment })).toEqual({
      ok: false,
      error: 'attachment_not_allowed',
    })
  })

  it('引用は送った時点の様子を写す。レッスンにないものは引用できない', async () => {
    const { deps, saveChatMessage } = setup()
    const quote = { kind: 'video' as const, targetId: 'v1' }
    expect((await send(coach, deps, 'ここの左手', false, { quote })).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0].quote).toEqual({
      kind: 'video',
      targetId: 'v1',
      submissionIndex: 0,
      angle: 'front',
    })
    expect(
      await send(student, deps, 'これ？', false, { quote: { kind: 'card', targetId: 'x' } })
    ).toEqual({ ok: false, error: 'invalid_quote' })
  })

  it('当事者でなければ送れない', async () => {
    const { deps } = setup()
    expect(await send({ userId: 'other', name: '' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('空のメッセージは送れない', async () => {
    const { deps } = setup()
    expect(await send(student, deps, '   ')).toEqual({ ok: false, error: 'empty' })
  })

  it('終了したレッスンには送れない', async () => {
    const { deps } = setup({ ...thread, status: 'closed' })
    expect(await send(student, deps)).toEqual({ ok: false, error: 'closed' })
  })

  it('不在中に生徒が送ると、記録とお知らせ。「次から表示しない」なら了承も残す', async () => {
    const day = now.toISOString().slice(0, 10)
    const { deps, saveChatMessage, saveThreadNotice, saveAbsenceAck } = setup(
      thread,
      absentFacts(day, day)
    )
    await send(student, deps, '質問です', true)
    expect(saveChatMessage.mock.calls[0]?.[0].sentDuringAbsenceId).toBe('absence-1')
    expect(saveThreadNotice).toHaveBeenCalledTimes(1)
    expect(saveThreadNotice.mock.calls[0]?.[0].submissionId).toBe('s1')
    expect(saveAbsenceAck.mock.calls[0]?.[0]).toMatchObject({
      studentUserId: 'student-1',
      threadId: 'thread-1',
      absenceId: 'absence-1',
    })
  })

  it('不在中でも、コーチ自身の発言ではお知らせを出さない', async () => {
    const day = now.toISOString().slice(0, 10)
    const { deps, saveThreadNotice, saveAbsenceAck } = setup(thread, absentFacts(day, day))
    await send(coach, deps, '戻りました', true)
    expect(saveThreadNotice).not.toHaveBeenCalled()
    expect(saveAbsenceAck).not.toHaveBeenCalled()
  })
})
