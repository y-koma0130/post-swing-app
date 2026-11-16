'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Drawer } from '@/app/components/ui/Drawer'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { QuoteButton } from '@/app/features/chat/components/QuoteContext'
import { formatShortDate } from '@/app/features/coach-availability/utils/availabilityText'
import { ReviewCardStrip } from '@/app/features/review-card/components/ReviewCardStrip'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import {
  ANGLE_LABEL,
  KEY_POSITION_LABEL,
  ordinalLabel,
  quoteAnchorId,
  submissionLabel,
  videoLabel,
} from '@/app/features/thread/utils/threadText'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { formatDateTime } from '@/app/utils/format'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { ReviewWorkspace } from './ReviewWorkspace'

type Props = {
  thread: Pick<ThreadDetailDto, 'id' | 'status' | 'submissions' | 'messages' | 'notices' | 'limits'>
  drills: DrillDto[]
}

type Submission = ThreadDetailDto['submissions'][number]

/**
 * コーチのスレッド画面。生徒と同じ時系列と入力欄を置き、添削の作業はドロワーで開く
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const CoachThreadView = ({ thread, drills }: Props) => {
  const closed = thread.status === 'closed'
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

  const angleOf = (submission: Submission) => (videoId: string) => {
    const video = submission.videos.find((v) => v.id === videoId)
    return video && submission.videos.length > 1 ? ANGLE_LABEL[video.angle] : null
  }

  return (
    <>
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
              ) : (
                <Button size="sm" onClick={() => open(index)} disabled={closed}>
                  添削する
                </Button>
              )}
            </div>
            {/* 動画は小さく並べ、押すとドロワーで大きく開く */}
            <ul className="flex flex-wrap gap-3">
              {submission.videos.map((video, videoIndex) => {
                const label = videoLabel(video.angle, submission.videos.length)
                return (
                  <li
                    key={video.id}
                    id={quoteAnchorId('video', video.id)}
                    className="w-40 scroll-mt-20 space-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => open(index, videoIndex)}
                      className="relative block w-full overflow-hidden rounded-lg bg-black"
                      aria-label={`${label}を開く`}
                    >
                      {/* 最初のコマだけを読み、サムネイルにする */}
                      <video
                        src={`${video.url}#t=0.1`}
                        preload="metadata"
                        muted
                        playsInline
                        className="aspect-video w-full object-contain"
                      />
                      <span className="text-caption absolute top-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 font-bold text-white">
                        {label}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center text-xl text-white/90">
                        ▶︎
                      </span>
                    </button>
                    <div className="flex justify-end">
                      <QuoteButton
                        target={{
                          kind: 'video',
                          targetId: video.id,
                          label: `${ordinalLabel(index)}・${label === '動画' ? label : `${label}の動画`}`,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            {submission.note && (
              <p className="text-caption text-body whitespace-pre-wrap">{submission.note}</p>
            )}
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
                cards={submission.reply.cards}
                videoLabel={angleOf(submission)}
                onOpen={() => open(index)}
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
          title={`${submissionLabel(workIndex)}${submissions[workIndex]?.reply ? '' : 'を添削する'}`}
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
            onSent={() => setOpenIndex(null)}
          />
        </Drawer>
      )}
    </>
  )
}
