import { calcCoachAvailability } from '@/server/features/coach/domain/services/calcCoachAvailability.service'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { absenceAtSend } from '../../domain/services/absenceAtSend.service'
import { type ChatBlocker, checkChatMessage } from '../../domain/services/checkChatMessage.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import { roleInThread } from '../../domain/services/roleInThread.service'
import type { ChatSender } from '../../domain/values/ChatMessage'
import type { Thread } from '../../domain/values/Thread'
import type { NewThreadNotice } from '../../domain/values/ThreadNotice'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewChatMessage = Readonly<{
  id: string
  threadId: string
  videoId: string
  senderRole: ChatSender
  senderUserId: string
  body: string
  sentAt: Date
  nextStatus: ThreadStatus
  /** 送ったとき、コーチが不在中だったか */
  sentDuringAbsenceId: string | null
}>

export type SendChatMessageParams = Readonly<{
  actor: Actor
  threadId: string
  videoId: string
  body: string
  /** 生徒が確認で「この不在期間中は次から表示しない」を選んだ */
  hideAbsenceNoticeFromNow: boolean
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** コーチの不在期間と返信遅れフラグ（coach が持つ） */
  findCoachAvailabilityFacts: (coachUserId: string) => Promise<{
    absences: CoachAbsence[]
    delayFlagSetAt: Date | null
  }>
  saveThreadNotice: (notice: NewThreadNotice) => Promise<void>
  /** 生徒が「この不在期間中は次から表示しない」を選んだ記録 */
  saveAbsenceAck: (input: {
    studentUserId: string
    threadId: string
    absenceId: string
    at: Date
  }) => Promise<void>
  saveChatMessage: (message: NewChatMessage) => Promise<void>
  /** 相手に知らせる（キューに積むだけ） */
  notifyChatMessage: (input: {
    threadId: string
    to: ChatSender
    recipientUserId: string
  }) => Promise<void>
  generateId: () => string
}>

export type SendChatMessageError = 'not_found' | ChatBlocker

export type SendChatMessage = (
  params: SendChatMessageParams,
  dependencies: Dependencies
) => Promise<Result<{ messageId: string }, SendChatMessageError>>

/**
 * チャットを送る（動画ごと）。送れるのはスレッドのコーチと生徒だけで、
 * 送れるかは checkChatMessage で決める
 */
export const sendChatMessage: SendChatMessage = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  const role = thread ? roleInThread(thread, params.actor.userId) : null
  if (!thread || role === null || !thread.videos.some((v) => v.id === params.videoId)) {
    return err('not_found')
  }
  const checked = checkChatMessage({
    thread,
    videoId: params.videoId,
    sender: role,
    body: params.body,
  })
  if (!checked.ok) {
    return err(checked.error)
  }
  const { body } = checked.value
  const absence = absenceAtSend(
    calcCoachAvailability({
      ...(await deps.findCoachAvailabilityFacts(thread.coachUserId)),
      now: params.now,
    })
  )

  const messageId = deps.generateId()
  await deps.saveChatMessage({
    id: messageId,
    threadId: thread.id,
    videoId: params.videoId,
    senderRole: role,
    senderUserId: params.actor.userId,
    body,
    sentAt: params.now,
    nextStatus: nextStatusAfter(thread, role === 'coach' ? 'coach_chatted' : 'student_chatted'),
    sentDuringAbsenceId: role === 'student' ? (absence?.absenceId ?? null) : null,
  })
  // コーチ自身の発言では、不在のお知らせは出さない
  if (absence && role === 'student') {
    await deps.saveThreadNotice({
      ...absence,
      id: deps.generateId(),
      threadId: thread.id,
      videoId: params.videoId,
      createdAt: params.now,
    })
    if (params.hideAbsenceNoticeFromNow) {
      await deps.saveAbsenceAck({
        studentUserId: params.actor.userId,
        threadId: thread.id,
        absenceId: absence.absenceId,
        at: params.now,
      })
    }
  }
  await deps.notifyChatMessage(
    role === 'coach'
      ? { threadId: thread.id, to: 'student', recipientUserId: thread.studentUserId }
      : { threadId: thread.id, to: 'coach', recipientUserId: thread.coachUserId }
  )
  return ok({ messageId })
}
