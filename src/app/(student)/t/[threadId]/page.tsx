import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Page, PageHeader } from '@/app/components/ui/Page'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { QuoteButton, QuoteProvider } from '@/app/features/chat/components/QuoteContext'
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
import { ReviewCardList } from '@/app/features/review-card/components/ReviewCardList'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import {
  ANGLE_LABEL,
  KEY_POSITION_LABEL,
  ordinalLabel,
  quoteAnchorId,
  STUDENT_CHAT_BLOCKER_MESSAGE,
  SUBMISSION_BLOCKER_MESSAGE,
  submissionLabel,
  threadUsageText,
} from '@/app/features/thread/utils/threadText'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { SubmissionForm } from '@/app/features/video-upload/components/SubmissionForm'
import { formatDateTime, formatMonthDay } from '@/app/utils/format'
import { getActor } from '@/server/auth/getActor'
import { getStudentThread } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: 'スレッド' }

type Props = {
  params: Promise<{ threadId: string }>
}

/** 生徒の閲覧ページ：提出・添削・チャットを時系列で見て、次を提出する */
const ThreadViewPage = async ({ params }: Props) => {
  const { threadId } = await params
  if (!(await getActor())) redirect(`/login?next=${encodeURIComponent(`/t/${threadId}`)}`)
  const thread = await getStudentThread(threadId)
  if (!thread) notFound()
  const availability = thread.coachAvailability
  const banner = availabilityBanner(thread.coachName, availability)
  const { limits } = thread

  return (
    <QuoteProvider>
      <Page layout="student">
        <PageHeader
          back={{ href: '/me', label: 'マイページ' }}
          eyebrow={
            <span className="flex items-center gap-2">
              <CoachAvatar name={thread.coachName} url={thread.coachAvatarUrl} size={24} />
              {thread.coachName} さんの添削
            </span>
          }
          title={thread.theme === '' ? '動画を提出しましょう' : thread.theme}
          description={
            <>
              {threadUsageText({
                submissionCount: thread.submissions.length,
                maxSubmissions: limits.maxSubmissions,
                remainingStudentMessages: thread.remainingStudentMessages,
              })}
              ・期限 {formatMonthDay(thread.expiresAt)}
              {extensionNote(thread.extendedDays)}
            </>
          }
        />
        {banner && thread.status !== 'closed' && (
          <p role="status" className="bg-warning-soft text-body rounded-xl p-4 text-sm">
            {banner}
          </p>
        )}

        <ThreadTimeline
          submissions={thread.submissions}
          messages={thread.messages}
          notices={thread.notices}
          viewer="student"
          noticeText={(n) => absenceNoticeMessage(thread.coachName, n.absenceEndDate)}
          renderSubmission={(submission, index) => (
            <section className="space-y-3">
              <h2 className="text-heading flex items-baseline justify-between gap-2">
                {submissionLabel(index)}
                <span className="text-caption text-muted font-normal">
                  {formatDateTime(submission.submittedAt)}
                </span>
              </h2>
              {submission.videos.map((video) => (
                <div
                  key={video.id}
                  id={quoteAnchorId('video', video.id)}
                  className="group scroll-mt-20 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-caption text-muted font-bold">
                      {submission.videos.length > 1 ? ANGLE_LABEL[video.angle] : '動画'}
                    </p>
                    <QuoteButton
                      target={{
                        kind: 'video',
                        targetId: video.id,
                        label: `${ordinalLabel(index)}・${ANGLE_LABEL[video.angle]}の動画`,
                      }}
                    />
                  </div>
                  <VideoPlayer src={video.url} frameRate={video.frameRate} />
                </div>
              ))}
              {submission.note && (
                <p className="text-muted text-sm whitespace-pre-wrap">{submission.note}</p>
              )}
            </section>
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
                <ReviewCardList
                  cards={submission.reply.cards}
                  videoLabel={(videoId) => {
                    const video = submission.videos.find((v) => v.id === videoId)
                    return video && submission.videos.length > 1 ? ANGLE_LABEL[video.angle] : null
                  }}
                  renderAction={(card) => (
                    <QuoteButton
                      target={{
                        kind: 'card',
                        targetId: card.id,
                        label: `${ordinalLabel(index)}の添削・${KEY_POSITION_LABEL[card.position]}`,
                      }}
                    />
                  )}
                />
              </section>
            )
          }
          renderMessageVideo={(video) => (
            <VideoPlayer src={video.url} frameRate={video.frameRate} />
          )}
        />

        {thread.submissions.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">コーチに質問する</h2>
            {thread.studentChatBlocker === null ? (
              <ChatComposer
                threadId={thread.id}
                viewer="student"
                remaining={thread.remainingStudentMessages}
                inputHint={chatReplyHint(thread.coachName, availability)}
                guard={thread.sendGuard.chat}
                confirmMessage={
                  sendConfirmMessage('chat', thread.coachName, availability) ?? undefined
                }
              />
            ) : (
              <p className="text-caption text-muted">
                {STUDENT_CHAT_BLOCKER_MESSAGE[thread.studentChatBlocker]}
              </p>
            )}
          </section>
        )}

        {thread.status === 'closed' && (
          <section className="space-y-3">
            <h2 className="text-heading">{thread.coachName} さんのレビュー</h2>
            {thread.review ? (
              <p className="text-muted text-sm">
                ★{thread.review.rating} を送りました。ありがとうございました。
              </p>
            ) : (
              <Card>
                <CoachReviewForm threadId={thread.id} />
              </Card>
            )}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-heading">
            {thread.submissions.length === 0
              ? '動画を提出する'
              : `${ordinalLabel(thread.submissions.length)}を提出する`}
          </h2>
          {thread.submissionBlocker === null ? (
            <Card>
              <SubmissionForm
                threadId={thread.id}
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
              />
            </Card>
          ) : (
            <p className="bg-surface text-muted rounded-xl p-4 text-sm">
              {SUBMISSION_BLOCKER_MESSAGE[thread.submissionBlocker]}
            </p>
          )}
        </section>
      </Page>
    </QuoteProvider>
  )
}

export default ThreadViewPage
