'use client'

import { useState } from 'react'
import { Drawer } from '@/app/components/ui/Drawer'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import { VideoThumbnail } from '@/app/features/video-player/components/VideoThumbnail'

type Props = {
  url: string
  frameRate: number | null
}

/** コーチがチャットで送った動画（お手本など）。小さく出し、押すと全画面で再生する */
export const MessageVideo = ({ url, frameRate }: Props) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="w-48">
        <VideoThumbnail src={url} label="お手本" onOpen={() => setOpen(true)} />
      </div>
      <Drawer open={open} title="コーチの動画" onClose={() => setOpen(false)}>
        {open && <VideoPlayer src={url} frameRate={frameRate} />}
      </Drawer>
    </>
  )
}
