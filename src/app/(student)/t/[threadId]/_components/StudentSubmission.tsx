'use client'

import { useState } from 'react'
import { chipClass } from '@/app/components/ui/choiceStyles'
import { Drawer } from '@/app/components/ui/Drawer'
import { LongPressQuote } from '@/app/features/chat/components/LongPressQuote'
import {
  ordinalLabel,
  quoteAnchorId,
  submissionLabel,
  submissionVideoLabel,
} from '@/app/features/thread/utils/threadText'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { VideoThumbnail } from '@/app/features/video-player/components/VideoThumbnail'
import { formatDateTime } from '@/app/utils/format'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Props = {
  submission: ThreadDetailDto['submissions'][number]
  index: number
}

/**
 * 生徒の時系列の「◯回目の提出」。動画は小さく並べ、押すと全画面で再生（コマ送り）する。長押しで引用
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const StudentSubmission = ({ submission, index }: Props) => {
  const [open, setOpen] = useState<number | null>(null)
  const [shown, setShown] = useState(0)
  const count = submission.videos.length
  const current = submission.videos[shown] ?? submission.videos[0]

  const openVideo = (i: number) => {
    setShown(i)
    setOpen(i)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-heading flex items-baseline justify-between gap-2">
        {submissionLabel(index)}
        <span className="text-caption text-muted font-normal">
          {formatDateTime(submission.submittedAt)}
        </span>
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {submission.videos.map((video, i) => {
          const label = submissionVideoLabel(video, submission.videos)
          return (
            <li
              key={video.id}
              id={quoteAnchorId('video', video.id)}
              className="scroll-mt-20 space-y-1"
            >
              <LongPressQuote
                target={{
                  kind: 'video',
                  targetId: video.id,
                  label: `${ordinalLabel(index)}・${label === '動画' ? label : `${label}の動画`}`,
                }}
              >
                <VideoThumbnail src={video.url} label={label} onOpen={() => openVideo(i)} />
              </LongPressQuote>
            </li>
          )
        })}
      </ul>
      {submission.note && (
        <p className="bg-surface text-body rounded-lg p-3 text-sm whitespace-pre-wrap">
          {submission.note}
        </p>
      )}
      <Drawer open={open !== null} title={submissionLabel(index)} onClose={() => setOpen(null)}>
        <div className="space-y-3">
          {count > 1 && (
            <div className="flex gap-2" role="tablist" aria-label="動画の角度">
              {submission.videos.map((video, i) => (
                <button
                  key={video.id}
                  type="button"
                  role="tab"
                  aria-selected={i === shown}
                  onClick={() => setShown(i)}
                  className={chipClass(i === shown)}
                >
                  {submissionVideoLabel(video, submission.videos)}
                </button>
              ))}
            </div>
          )}
          {/* 閉じているあいだは再生しない（音やデータを使わないように） */}
          {open !== null && current && (
            <VideoPlayer key={current.url} src={current.url} frameRate={current.frameRate} />
          )}
        </div>
      </Drawer>
    </section>
  )
}
