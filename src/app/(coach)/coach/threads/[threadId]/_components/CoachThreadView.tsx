'use client'

import Link from 'next/link'
import { useState } from 'react'
import { QuoteButton } from '@/app/components/quote/QuoteContext'
import { Button, textButtonClass } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Drawer } from '@/app/components/ui/Drawer'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { formatShortDate } from '@/app/features/coach-availability/utils/availabilityText'
import { ReviewCardStrip } from '@/app/features/review-card/components/ReviewCardStrip'
import { SHARE_IMAGE_ENABLED } from '@/app/features/share-image/utils/shareLayout'
import { GolfProfileSummary } from '@/app/features/thread/components/GolfProfileSummary'
import { RetakeRequestPanel } from '@/app/features/thread/components/RetakeRequestPanel'
import { ScrollToLatest } from '@/app/features/thread/components/ScrollToLatest'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { VideoThumbnail } from '@/app/features/video-player/components/VideoThumbnail'
import { formatDateTime } from '@/app/utils/format'
import {
  cardQuoteLabel,
  cardVideoLabelOf,
  ordinalLabel,
  quoteAnchorId,
  submissionLabel,
  submissionVideoLabel,
  videoQuoteLabel,
} from '@/app/utils/threadText'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { ReviewWorkspace } from './ReviewWorkspace'

type Props = {
  thread: Pick<
    ThreadDetailDto,
    | 'id'
    | 'status'
    | 'submissions'
    | 'messages'
    | 'notices'
    | 'limits'
    | 'lastReadAt'
    | 'golfProfile'
    | 'retake'
    | 'shareConsent'
  >
  drills: DrillDto[]
}

/**
 * コーチのスレッド画面。生徒と同じ時系列と入力欄を置き、添削の作業はドロワーで開く
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const CoachThreadView = ({ thread, drills }: Props) => {
  // 添削・チャットができるのはレッスン中だけ（申し込みは承認してから、終わったら閉じる）
  const closed = thread.status !== 'waiting_coach' && thread.status !== 'waiting_student'
  const { submissions } = thread
  /** ドロワーで開いている提出。閉じていれば null */
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // 閉じても作業中のカードを残すため、最後に開いた提出と動画を覚えておく
  const [workIndex, setWorkIndex] = useState(0)
  const [videoIndex, setVideoIndex] = useState(0)

  const open = (index: number, video = 0) => {
    setWorkIndex(index)
    setVideoIndex(video)
    setOpenIndex(index)
  }

  return (
    <>
      <ScrollToLatest />
      {submissions.length === 0 && (
        <p className="rounded-card text-muted bg-white p-6 text-sm shadow-sm">
          まだ動画が届いていません。届いたらメールでお知らせします。
        </p>
      )}
      <ThreadTimeline
        submissions={submissions}
        messages={thread.messages}
        notices={thread.notices}
        viewer="coach"
        lastReadAt={thread.lastReadAt.coach}
        noticeText={(n) => `不在中に送られました（${formatShortDate(n.absenceEndDate)}まで不在）`}
        renderSubmission={(submission, index) => (
          <Card
            className={`space-y-3 p-4 ${submission.reply ? '' : 'border-mint ring-mint/30 ring-2'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-heading">
                {submissionLabel(index)}
                <span className="text-caption text-muted ml-2 font-normal">
                  {formatDateTime(submission.submittedAt)}
                </span>
              </h2>
              {submission.reply ? (
                <Button variant="secondary" size="sm" onClick={() => open(index)}>
                  大きく見る
                </Button>
              ) : closed ? (
                <Button variant="secondary" size="sm" onClick={() => open(index)}>
                  大きく見る
                </Button>
              ) : (
                <Button size="sm" onClick={() => open(index)}>
                  添削する
                </Button>
              )}
            </div>
            {/* 左に動画（押すとドロワーで大きく開く）、右に生徒が添えた質問・メモ */}
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <ul className="flex flex-wrap gap-3">
                {submission.videos.map((video, videoIndex) => {
                  const label = submissionVideoLabel(video, submission.videos)
                  return (
                    <li
                      key={video.id}
                      id={quoteAnchorId('video', video.id)}
                      className="w-40 scroll-mt-20 space-y-1"
                    >
                      <VideoThumbnail
                        src={video.url}
                        label={label}
                        onOpen={() => open(index, videoIndex)}
                      />
                      <div className="flex justify-end">
                        <QuoteButton
                          target={{
                            kind: 'video',
                            targetId: video.id,
                            label: videoQuoteLabel(index, video, submission.videos),
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="space-y-2">
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-caption text-muted font-bold">生徒のメモ</p>
                  <p className="text-body mt-1 text-sm whitespace-pre-wrap">
                    {submission.note || '（メモはありません）'}
                  </p>
                </div>
                {/* 最初の提出（申し込みの悩み）では、ゴルフの様子を補足として小さく添える */}
                {index === 0 && <GolfProfileSummary golfProfile={thread.golfProfile} />}
              </div>
            </div>
            <RetakeRequestPanel
              threadId={thread.id}
              submissionId={submission.id}
              requests={thread.retake.requests.filter((r) => r.submissionId === submission.id)}
              canRequest={
                thread.status === 'waiting_coach' &&
                index === submissions.length - 1 &&
                !submission.reply &&
                !thread.retake.requests.some((r) => r.closedAt === null) &&
                thread.retake.remaining > 0
              }
              remaining={thread.retake.remaining}
            />
          </Card>
        )}
        renderReply={(submission, index) =>
          submission.reply && (
            <Card className="space-y-3 p-4">
              <h2 className="text-heading">
                {ordinalLabel(index)}の添削
                <span className="text-caption text-muted ml-2 font-normal">
                  {formatDateTime(submission.reply.sentAt)}
                </span>
              </h2>
              <ReviewCardStrip
                reply={submission.reply}
                videoLabel={cardVideoLabelOf(submission.videos)}
                onOpen={() => open(index)}
                renderAction={(card) => (
                  <QuoteButton
                    target={{
                      kind: 'card',
                      targetId: card.id,
                      label: cardQuoteLabel(index, card.position),
                    }}
                  />
                )}
              />
              {SHARE_IMAGE_ENABLED && (
                <div className="flex justify-end">
                  {thread.shareConsent?.allowPublish ? (
                    <Link
                      href={`/coach/threads/${thread.id}/share/${submission.id}`}
                      className={textButtonClass()}
                    >
                      シェア画像を作る
                    </Link>
                  ) : (
                    <span className="text-caption text-muted">
                      シェア画像：生徒が公開を許可していません
                    </span>
                  )}
                </div>
              )}
            </Card>
          )
        }
        renderMessageVideo={(video) => <VideoPlayer src={video.url} frameRate={video.frameRate} />}
      />
      {!closed && (
        <div className="border-line-soft bg-surface/95 sticky bottom-0 -mx-6 border-t px-6 py-3 backdrop-blur">
          <ChatComposer
            threadId={thread.id}
            viewer="coach"
            coach={{
              drills,
              maxVideoBytes: thread.limits.maxVideoBytes,
              maxVideoSeconds: thread.limits.maxVideoSeconds,
            }}
          />
        </div>
      )}
      {submissions.length > 0 && (
        <Drawer
          open={openIndex !== null}
          title={`${submissionLabel(workIndex)}${submissions[workIndex]?.reply || closed ? '' : 'を添削する'}`}
          onClose={() => setOpenIndex(null)}
          size="wide"
        >
          <ReviewWorkspace
            threadId={thread.id}
            closed={closed}
            submissions={submissions}
            index={workIndex}
            onIndexChange={setWorkIndex}
            videoIndex={videoIndex}
            onVideoIndexChange={setVideoIndex}
            drills={drills}
            golfProfile={thread.golfProfile}
            onSent={() => setOpenIndex(null)}
          />
        </Drawer>
      )}
    </>
  )
}
