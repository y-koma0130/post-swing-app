import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { LongPressQuote } from '@/app/features/chat/components/LongPressQuote'
import { QuoteProvider } from '@/app/features/chat/components/QuoteContext'
import {
  absenceNoticeMessage,
  availabilityBanner,
  chatReplyHint,
  extensionNote,
  replyTargetMessage,
  sendConfirmMessage,
} from '@/app/features/coach-availability/utils/availabilityText'
import { CoachAvatar } from '@/app/features/coach-profile/components/CoachAvatar'
import { CoachReviewForm } from '@/app/features/coach-review/components/CoachReviewForm'
import { ReviewView } from '@/app/features/review-card/components/ReviewView'
import { CloseThreadButton } from '@/app/features/thread/components/CloseThreadButton'
import { MarkThreadRead } from '@/app/features/thread/components/MarkThreadRead'
import { ScrollToLatest } from '@/app/features/thread/components/ScrollToLatest'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import { latestTimelineAt } from '@/app/features/thread/utils/buildTimeline'
import {
  ANGLE_LABEL,
  KEY_POSITION_LABEL,
  ordinalLabel,
  STUDENT_CHAT_BLOCKER_MESSAGE,
  SUBMISSION_BLOCKER_SHORT,
  submissionLabel,
  threadUsageText,
} from '@/app/features/thread/utils/threadText'
import { SubmissionLauncher } from '@/app/features/video-upload/components/SubmissionLauncher'
import { formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import { getStudentThread } from '@/server/features/thread/presentation/queries'
import { ApplicationStatus } from './_components/ApplicationStatus'
import { MessageVideo } from './_components/MessageVideo'
import { StudentSubmission } from './_components/StudentSubmission'

export const metadata: Metadata = { title: 'スレッド' }

type Props = {
  params: Promise<{ threadId: string }>
  searchParams: Promise<{ applied?: string }>
}

/** 申し込み（承認制）のあいだの状態 */
const APPLICATION_STATUSES = ['draft', 'requested', 'declined'] as const

/** 生徒の閲覧ページ：提出・添削・チャットを時系列で見て、次を提出する */
const ThreadViewPage = async ({ params, searchParams }: Props) => {
  const { threadId } = await params
  const { applied } = await searchParams
  if (!(await getActor())) redirect(`/login?next=${encodeURIComponent(`/t/${threadId}`)}`)
  const thread = await getStudentThread(threadId)
  if (!thread) notFound()
  const availability = thread.coachAvailability
  const banner = availabilityBanner(thread.coachName, availability)
  const { limits } = thread
  const statuses: ReadonlyArray<string> = APPLICATION_STATUSES
  const applying = statuses.includes(thread.status)

  return (
    <QuoteProvider>
      <MarkThreadRead threadId={thread.id} latestAt={latestTimelineAt(thread)} />
      <ScrollToLatest />
      <Page layout="student">
        <PageHeader
          back={{ href: '/me', label: 'マイページ' }}
          eyebrow={
            <span className="flex items-center gap-2">
              <CoachAvatar name={thread.coachName} url={thread.coachAvatarUrl} size={24} />
              {thread.coachName} さんの添削
            </span>
          }
          title={
            thread.theme === ''
              ? applying
                ? '悩みと動画を送って申し込みましょう'
                : '動画を提出しましょう'
              : thread.theme
          }
          description={
            applying ? null : (
              <>
                {threadUsageText({
                  submissionCount: thread.submissions.length,
                  maxSubmissions: limits.maxSubmissions,
                  remainingStudentMessages: thread.remainingStudentMessages,
                })}
                ・期限 {formatMonthDay(thread.expiresAt)}
                {extensionNote(thread.extendedDays)}
              </>
            )
          }
        />
        <ApplicationStatus thread={thread} justApplied={applied === '1'} />
        {banner && !applying && thread.status !== 'closed' && (
          <p role="status" className="bg-warning-soft text-body rounded-xl p-4 text-sm">
            {banner}
          </p>
        )}

        <ThreadTimeline
          submissions={thread.submissions}
          messages={thread.messages}
          notices={thread.notices}
          viewer="student"
          lastReadAt={thread.lastReadAt.student}
          noticeText={(n) => absenceNoticeMessage(thread.coachName, n.absenceEndDate)}
          renderSubmission={(submission, index) => (
            <StudentSubmission submission={submission} index={index} />
          )}
          renderReply={(submission, index) =>
            submission.reply && (
              <section className="space-y-3">
                <h2 className="text-heading">
                  {thread.coachName} さんの添削
                  <span className="text-caption text-muted ml-2 font-normal">
                    {submissionLabel(index)}へ
                  </span>
                </h2>
                <ReviewView
                  reply={submission.reply}
                  videoLabel={(videoId) => {
                    const video = submission.videos.find((v) => v.id === videoId)
                    return video && submission.videos.length > 1 ? ANGLE_LABEL[video.angle] : null
                  }}
                  wrapCard={(card, content) => (
                    <LongPressQuote
                      target={{
                        kind: 'card',
                        targetId: card.id,
                        label: `${ordinalLabel(index)}の添削・${KEY_POSITION_LABEL[card.position]}`,
                      }}
                    >
                      {content}
                    </LongPressQuote>
                  )}
                />
              </section>
            )
          }
          renderMessageVideo={(video) => (
            <MessageVideo url={video.url} frameRate={video.frameRate} />
          )}
          quoteMode="longPress"
        />

        {thread.studentCloseBlocker === null && (
          <CloseThreadButton threadId={thread.id} coachName={thread.coachName} />
        )}
        {/* チャットの入力欄。提出もここから（ドロワーで開く）。申し込みで動画を送ったあとは、上の案内だけ */}
        {applying && thread.submissions.length > 0 ? null : (
          <div className="border-line-soft sticky bottom-0 -mx-6 border-t bg-white/95 px-6 py-3 backdrop-blur">
            {thread.status === 'closed' ? (
              // 終わったスレッドは、入力欄の代わりにレビューを書いてもらう
              thread.review ? (
                <p className="text-muted text-center text-sm">
                  ★{thread.review.rating} のレビューを送りました。ありがとうございました。
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-bold">{thread.coachName} さんのレビューを書く</p>
                  <CoachReviewForm threadId={thread.id} />
                </div>
              )
            ) : thread.studentChatBlocker === null ? (
              <ChatComposer
                threadId={thread.id}
                viewer="student"
                remaining={thread.remainingStudentMessages}
                inputHint={chatReplyHint(thread.coachName, availability)}
                guard={thread.sendGuard.chat}
                confirmMessage={
                  sendConfirmMessage('chat', thread.coachName, availability) ?? undefined
                }
                quoteByLongPress
                actions={
                  <SubmissionLauncher
                    threadId={thread.id}
                    submissionCount={thread.submissions.length}
                    maxSubmissions={limits.maxSubmissions}
                    blockedReason={
                      thread.submissionBlocker === null
                        ? null
                        : SUBMISSION_BLOCKER_SHORT[thread.submissionBlocker]
                    }
                    needsTheme={thread.submissions.length === 0}
                    maxVideos={limits.maxVideosPerSubmission}
                    maxBytes={limits.maxVideoBytes}
                    maxSeconds={limits.maxVideoSeconds}
                    confirmMessage={
                      thread.sendGuard.video === 'none'
                        ? null
                        : sendConfirmMessage('video', thread.coachName, availability)
                    }
                    replyHint={
                      availability.kind === 'available'
                        ? replyTargetMessage(availability.replyTargetHours)
                        : null
                    }
                    prominent={false}
                  />
                }
              />
            ) : thread.submissions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-caption text-muted text-center">
                  {applying
                    ? `直したいところと撮った動画を送ってください。${thread.coachName}さんが内容を見て受け付けます`
                    : `撮った動画を送ると、ここに${thread.coachName}さんの添削が届きます`}
                </p>
                <SubmissionLauncher
                  threadId={thread.id}
                  submissionCount={thread.submissions.length}
                  maxSubmissions={limits.maxSubmissions}
                  blockedReason={
                    thread.submissionBlocker === null
                      ? null
                      : SUBMISSION_BLOCKER_SHORT[thread.submissionBlocker]
                  }
                  needsTheme={thread.submissions.length === 0}
                  maxVideos={limits.maxVideosPerSubmission}
                  maxBytes={limits.maxVideoBytes}
                  maxSeconds={limits.maxVideoSeconds}
                  confirmMessage={
                    thread.sendGuard.video === 'none'
                      ? null
                      : sendConfirmMessage('video', thread.coachName, availability)
                  }
                  replyHint={
                    availability.kind === 'available'
                      ? replyTargetMessage(availability.replyTargetHours)
                      : null
                  }
                  prominent
                />
              </div>
            ) : (
              <p className="text-caption text-muted">
                {STUDENT_CHAT_BLOCKER_MESSAGE[thread.studentChatBlocker]}
              </p>
            )}
          </div>
        )}
      </Page>
    </QuoteProvider>
  )
}

export default ThreadViewPage
