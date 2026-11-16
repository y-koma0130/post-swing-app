import type { ReactNode } from 'react'
import { Card } from '@/app/components/ui/Card'
import { ChatComposer } from '@/app/features/chat/components/ChatComposer'
import { formatShortDate } from '@/app/features/coach-availability/utils/availabilityText'
import { ThreadTimeline } from '@/app/features/thread/components/ThreadTimeline'
import { ANGLE_LABEL, ordinalLabel, submissionLabel } from '@/app/features/thread/utils/threadText'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Props = {
  threadId: string
  closed: boolean
  submissions: ThreadDetailDto['submissions']
  messages: ThreadDetailDto['messages']
  notices: ThreadDetailDto['notices']
  drills: DrillDto[]
  limits: Pick<ThreadDetailDto['limits'], 'maxVideoBytes' | 'maxVideoSeconds'>
}

/** 添削画面の「やりとり」。チャットを時系列で見せ、提出と添削は目印だけ置く */
export const CoachConversation = ({
  threadId,
  closed,
  submissions,
  messages,
  notices,
  drills,
  limits,
}: Props) => (
  <Card className="space-y-3">
    <h2 className="text-heading">やりとり</h2>
    <ThreadTimeline
      submissions={submissions}
      messages={messages}
      notices={notices}
      viewer="coach"
      noticeText={(n) => `不在中に送られました（${formatShortDate(n.absenceEndDate)}まで不在）`}
      renderSubmission={(submission, i) => (
        <Marker>
          {submissionLabel(i)}（{submission.videos.map((v) => ANGLE_LABEL[v.angle]).join('・')}）
        </Marker>
      )}
      renderReply={(_, i) => <Marker>{ordinalLabel(i)}の添削を送りました</Marker>}
      renderMessageVideo={(video) => <VideoPlayer src={video.url} frameRate={video.frameRate} />}
    />
    {!closed && (
      <ChatComposer
        threadId={threadId}
        viewer="coach"
        coach={{
          drills,
          maxVideoBytes: limits.maxVideoBytes,
          maxVideoSeconds: limits.maxVideoSeconds,
        }}
      />
    )}
  </Card>
)

const Marker = ({ children }: { children: ReactNode }) => (
  <p className="text-caption text-muted border-line-soft border-t pt-2 text-center font-bold">
    {children}
  </p>
)
