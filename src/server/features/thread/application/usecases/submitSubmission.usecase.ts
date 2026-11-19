import { calcCoachAvailability } from '@/server/features/coach/domain/services/calcCoachAvailability.service'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import {
  checkShareConsent,
  type ShareConsentBlocker,
} from '@/server/features/share/domain/services/checkShareConsent.service'
import type { ShareConsentChoices } from '@/server/features/share/domain/values/ShareConsent'
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
import type { GolfProfile } from '../../domain/values/GolfProfile'
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
  /** 最初の提出のときだけ、ラウンドの回数と平均スコアも保存する */
  golfProfile: GolfProfile | null
}>

export type SubmitSubmissionParams = Readonly<{
  actor: Actor
  threadId: string
  theme: string
  note: string
  /** ラウンドの回数と平均スコア（フォームのまま。最初の提出だけ使う） */
  golfProfile: Readonly<{ ageRange: string; roundFrequency: string; averageScore: string }>
  /** 上げておいた動画（1〜2本） */
  videoIds: ReadonlyArray<string>
  /** 公開の許可（申し込みの最初の提出のときだけ使う。選ばなければ「公開しない」） */
  shareConsent: ShareConsentChoices
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
  /** 申し込みのときに選んだ公開の許可を保存する（share が持つ） */
  recordShareConsent: (input: {
    coachUserId: string
    studentUserId: string
    choices: ShareConsentChoices
    now: Date
  }) => Promise<void>
  /** モニターで申し込んだことのあるコーチか（公開をやめられない。share が持つ） */
  isShareConsentLocked: (studentUserId: string, coachUserId: string) => Promise<boolean>
  generateId: () => string
}>

export type SubmitSubmissionError =
  | 'not_found'
  | SubmissionBlocker
  | SubmissionContentsBlocker
  | ShareConsentBlocker

export type SubmitSubmission = (
  params: SubmitSubmissionParams,
  dependencies: Dependencies
) => Promise<Result<{ submissionId: Submission['id'] }, SubmitSubmissionError>>

/**
 * 生徒が提出する（上げておいた動画1〜2本とメモをまとめる）。
 * いま提出できるかは checkSubmission、中身は checkSubmissionContents で決める。
 * 申し込みの下書きでの提出（悩みと動画）は、カードを登録して承認待ちになるまでコーチに知らせない。
 * 申し込みの最初の提出では、公開の許可も保存する（18歳未満は許可できない。checkShareConsent）
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
    golfProfile: params.golfProfile,
  })
  if (!contents.ok) {
    return err(contents.error)
  }
  // 申し込み（下書き）の最初の提出でだけ、公開の許可を聞く
  // モニターで申し込んだことのあるコーチには、あとの申し込みでも公開をやめられない
  const consent =
    thread.status === 'draft' && contents.value.golfProfile !== null
      ? checkShareConsent({
          choices: params.shareConsent,
          ageRange: contents.value.golfProfile.ageRange,
          locked: await deps.isShareConsentLocked(thread.studentUserId, thread.coachUserId),
        })
      : null
  if (consent && !consent.ok) {
    return err(consent.error)
  }

  // 申し込みの下書きでは、コーチにはまだ見えない（不在のお知らせも通知も、承認待ちになってから）
  const draft = thread.status === 'draft'
  const absence = draft ? null : absenceAtSend(calcCoachAvailability({ ...facts, now: params.now }))
  const submissionId = deps.generateId()
  await deps.saveSubmission({
    id: submissionId,
    threadId: thread.id,
    note: contents.value.note,
    theme: contents.value.theme,
    golfProfile: contents.value.golfProfile,
    videoIds: contents.value.videos.map((v) => v.id),
    submittedAt: params.now,
    nextStatus: nextStatusAfter(thread, 'student_submitted'),
    sentDuringAbsenceId: absence?.absenceId ?? null,
  })
  if (consent?.ok) {
    await deps.recordShareConsent({
      coachUserId: thread.coachUserId,
      studentUserId: thread.studentUserId,
      choices: consent.value,
      now: params.now,
    })
  }
  if (absence) {
    await deps.saveThreadNotice({
      ...absence,
      id: deps.generateId(),
      threadId: thread.id,
      submissionId,
      createdAt: params.now,
    })
  }
  if (!draft) {
    await deps.notifySubmitted({ threadId: thread.id, coachUserId: thread.coachUserId })
  }
  return ok({ submissionId })
}
