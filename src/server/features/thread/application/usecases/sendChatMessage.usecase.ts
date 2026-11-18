import { calcCoachAvailability } from '@/server/features/coach/domain/services/calcCoachAvailability.service'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { absenceAtSend } from '../../domain/services/absenceAtSend.service'
import {
  type ChatAttachmentBlocker,
  type ChatAttachmentRequest,
  checkChatAttachment,
} from '../../domain/services/checkChatAttachment.service'
import { type ChatBlocker, checkChatMessage } from '../../domain/services/checkChatMessage.service'
import {
  checkQuoteTarget,
  type QuoteRequest,
  type ThreadCard,
} from '../../domain/services/checkQuoteTarget.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import { roleInThread } from '../../domain/services/roleInThread.service'
import type { ChatAttachment, ChatQuote, ChatSender } from '../../domain/values/ChatMessage'
import type { DraftVideo } from '../../domain/values/Submission'
import type { Thread } from '../../domain/values/Thread'
import type { NewThreadNotice } from '../../domain/values/ThreadNotice'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewChatMessage = Readonly<{
  id: string
  threadId: string
  senderRole: ChatSender
  senderUserId: string
  body: string
  attachment: ChatAttachment
  quote: ChatQuote | null
  sentAt: Date
  nextStatus: ThreadStatus
  /** 送ったとき、コーチが不在中だったか */
  sentDuringAbsenceId: string | null
}>

export type SendChatMessageParams = Readonly<{
  actor: Actor
  threadId: string
  body: string
  /** 添えるもの（コーチだけ） */
  attachment: ChatAttachmentRequest
  /** 引用（なければ null） */
  quote: QuoteRequest | null
  /** 生徒が確認で「この不在期間中は次から表示しない」を選んだ */
  hideAbsenceNoticeFromNow: boolean
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** スレッドの添削カード（引用先の確認に使う） */
  findThreadCards: (threadId: string) => Promise<ThreadCard[]>
  /** コーチ自身のドリル（drill が持つ）。ほかのコーチのものなら null */
  findOwnDrill: (
    coachUserId: string,
    drillId: string
  ) => Promise<{ title: string; description: string } | null>
  findDraftVideo: (videoId: string) => Promise<DraftVideo | null>
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
  /** メッセージを保存する（動画を添えたら、その動画もひも付ける） */
  saveChatMessage: (message: NewChatMessage) => Promise<void>
  /** 相手に知らせる（キューに積むだけ） */
  notifyChatMessage: (input: {
    threadId: string
    to: ChatSender
    recipientUserId: string
  }) => Promise<void>
  generateId: () => string
}>

export type SendChatMessageError =
  | 'not_found'
  | 'invalid_quote'
  | ChatBlocker
  | ChatAttachmentBlocker

export type SendChatMessage = (
  params: SendChatMessageParams,
  dependencies: Dependencies
) => Promise<Result<{ messageId: string }, SendChatMessageError>>

/**
 * チャットを送る（スレッドに1本の流れ）。送れるのはスレッドのコーチと生徒だけ。
 * 送れるかは checkChatMessage、添付は checkChatAttachment、引用は checkQuoteTarget で決める
 */
export const sendChatMessage: SendChatMessage = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  const role = thread ? roleInThread(thread, params.actor.userId) : null
  if (!thread || role === null) {
    return err('not_found')
  }
  const checked = checkChatMessage({
    thread,
    sender: role,
    body: params.body,
    attachmentKind: params.attachment.kind,
  })
  if (!checked.ok) {
    return err(checked.error)
  }
  const request = params.attachment
  const attachment = checkChatAttachment({
    request,
    threadId: thread.id,
    actorUserId: params.actor.userId,
    ownDrill:
      request.kind === 'drill'
        ? await deps.findOwnDrill(thread.coachUserId, request.drillId)
        : null,
    video: request.kind === 'video' ? await deps.findDraftVideo(request.videoId) : null,
  })
  if (!attachment.ok) {
    return err(attachment.error)
  }
  let quote: ChatQuote | null = null
  if (params.quote) {
    const quoted = checkQuoteTarget({
      thread,
      cards: await deps.findThreadCards(thread.id),
      request: params.quote,
    })
    if (!quoted.ok) {
      return err(quoted.error)
    }
    quote = quoted.value
  }
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
    senderRole: role,
    senderUserId: params.actor.userId,
    body: checked.value.body,
    attachment: attachment.value,
    quote,
    sentAt: params.now,
    nextStatus: nextStatusAfter(thread, role === 'coach' ? 'coach_chatted' : 'student_chatted'),
    sentDuringAbsenceId: role === 'student' ? (absence?.absenceId ?? null) : null,
  })
  // コーチ自身の発言では、不在のお知らせは出さない。生徒は提出のあとにしか送れないので、直近の提出に付ける
  const latestSubmission = thread.submissions.at(-1)
  if (absence && role === 'student' && latestSubmission) {
    await deps.saveThreadNotice({
      ...absence,
      id: deps.generateId(),
      threadId: thread.id,
      submissionId: latestSubmission.id,
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
