import { calcCoachAvailability } from '@/server/features/coach/domain/services/calcCoachAvailability.service'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { absenceAtSend } from '../../domain/services/absenceAtSend.service'
import { withEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import {
  checkSubmission,
  type SubmissionBlocker,
} from '../../domain/services/checkSubmission.service'
import {
  checkSubmissionContents,
  type SubmissionContentsBlocker,
} from '../../domain/services/checkSubmissionContents.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import type { DraftVideo, Submission } from '../../domain/values/Submission'
import type { Thread } from '../../domain/values/Thread'
import type { NewThreadNotice } from '../../domain/values/ThreadNotice'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewSubmission = Readonly<{
  id: string
  threadId: string
  note: string
  videoIds: ReadonlyArray<string>
  submittedAt: Date
  nextStatus: ThreadStatus
  /** 提出したとき、コーチが不在中だったか */
  sentDuringAbsenceId: string | null
  /** 最初の提出のときだけ、スレッドのテーマも保存する */
  theme: string | null
}>

export type SubmitSubmissionParams = Readonly<{
  actor: Actor
  threadId: string
  theme: string
  note: string
  /** 上げておいた動画（1〜2本） */
  videoIds: ReadonlyArray<string>
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** コーチの不在期間と返信遅れフラグ（coach が持つ） */
  findCoachAvailabilityFacts: (coachUserId: string) => Promise<{
    absences: CoachAbsence[]
    delayFlagSetAt: Date | null
  }>
  findDraftVideos: (videoIds: ReadonlyArray<string>) => Promise<DraftVideo[]>
  /** 提出を作り、動画をひも付け、スレッドをコーチの番にする */
  saveSubmission: (submission: NewSubmission) => Promise<void>
  /** 不在中に提出されたときのシステムメッセージ（同じ不在・同じスレッドで2回目以降は何もしない） */
  saveThreadNotice: (notice: NewThreadNotice) => Promise<void>
  /** コーチに「動画が届きました」と知らせる（キューに積むだけ） */
  notifySubmitted: (input: { threadId: string; coachUserId: string }) => Promise<void>
  generateId: () => string
}>

export type SubmitSubmissionError = 'not_found' | SubmissionBlocker | SubmissionContentsBlocker

export type SubmitSubmission = (
  params: SubmitSubmissionParams,
  dependencies: Dependencies
) => Promise<Result<{ submissionId: Submission['id'] }, SubmitSubmissionError>>

/**
 * 生徒が提出する（上げておいた動画1〜2本とメモをまとめる）。
 * いま提出できるかは checkSubmission、中身は checkSubmissionContents で決める
 */
export const submitSubmission: SubmitSubmission = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) {
    return err('not_found')
  }
  const facts = await deps.findCoachAvailabilityFacts(thread.coachUserId)
  const blocker = checkSubmission(withEffectiveExpiry(thread, facts.absences), params.now)
  if (blocker) {
    return err(blocker)
  }
  const contents = checkSubmissionContents({
    thread,
    actorUserId: params.actor.userId,
    videoIds: params.videoIds,
    drafts: await deps.findDraftVideos(params.videoIds),
    theme: params.theme,
    note: params.note,
  })
  if (!contents.ok) {
    return err(contents.error)
  }

  const absence = absenceAtSend(calcCoachAvailability({ ...facts, now: params.now }))
  const submissionId = deps.generateId()
  await deps.saveSubmission({
    id: submissionId,
    threadId: thread.id,
    note: contents.value.note,
    theme: contents.value.theme,
    videoIds: contents.value.videos.map((v) => v.id),
    submittedAt: params.now,
    nextStatus: nextStatusAfter(thread, 'student_submitted'),
    sentDuringAbsenceId: absence?.absenceId ?? null,
  })
  if (absence) {
    await deps.saveThreadNotice({
      ...absence,
      id: deps.generateId(),
      threadId: thread.id,
      submissionId,
      createdAt: params.now,
    })
  }
  await deps.notifySubmitted({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok({ submissionId })
}
