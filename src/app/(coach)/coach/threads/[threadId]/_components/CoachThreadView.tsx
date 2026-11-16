'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Drawer } from '@/app/components/ui/Drawer'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { QuoteButton } from '@/app/features/chat/components/QuoteContext'
import { formatShortDate } from '@/app/features/coach-availability/utils/availabilityText'
import { ReviewCardList } from '@/app/features/review-card/components/ReviewCardList'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import {
  ANGLE_LABEL,
  KEY_POSITION_LABEL,
  ordinalLabel,
  quoteAnchorId,
  submissionLabel,
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
  // 閉じても作業中のカードを残すため、最後に開いた提出を覚えておく
  const [workIndex, setWorkIndex] = useState(0)

  const open = (index: number) => {
    setWorkIndex(index)
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
            className={`space-y-3 ${submission.reply ? '' : 'border-mint ring-mint/30 ring-2'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-heading">{submissionLabel(index)}</h2>
              <span className="text-caption text-muted">
                {formatDateTime(submission.submittedAt)}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {submission.videos.map((video) => (
                <li
                  key={video.id}
                  id={quoteAnchorId('video', video.id)}
                  className="group bg-surface flex scroll-mt-20 items-center gap-2 rounded-full py-1 pr-2 pl-3 text-sm"
                >
                  {ANGLE_LABEL[video.angle]}の動画
                  <QuoteButton
                    target={{
                      kind: 'video',
                      targetId: video.id,
                      label: `${ordinalLabel(index)}・${ANGLE_LABEL[video.angle]}の動画`,
                    }}
                  />
                </li>
              ))}
            </ul>
            {submission.note && (
              <p className="text-body text-sm whitespace-pre-wrap">{submission.note}</p>
            )}
            {submission.reply ? (
              <Button variant="secondary" size="sm" onClick={() => open(index)}>
                動画を大きく見る
              </Button>
            ) : (
              <Button onClick={() => open(index)} disabled={closed}>
                添削する
              </Button>
            )}
          </Card>
        )}
        renderReply={(submission, index) =>
          submission.reply && (
            <section className="space-y-3">
              <h2 className="text-heading">
                {ordinalLabel(index)}の添削
                <span className="text-caption text-muted ml-2 font-normal">
                  {formatDateTime(submission.reply.sentAt)}
                </span>
              </h2>
              <ReviewCardList
                cards={submission.reply.cards}
                videoLabel={angleOf(submission)}
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
            drills={drills}
            onSent={() => setOpenIndex(null)}
          />
        </Drawer>
      )}
    </>
  )
}
