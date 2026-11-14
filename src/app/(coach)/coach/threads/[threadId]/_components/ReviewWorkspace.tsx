'use client'

import { AnnotationLayer } from '@/app/features/annotation/components/AnnotationLayer'
import { AnnotationToolbar } from '@/app/features/annotation/components/AnnotationToolbar'
import { useAnnotationEditor } from '@/app/features/annotation/hooks/useAnnotationEditor'
import { LocalVideoPlayer } from '@/app/features/video-player/components/LocalVideoPlayer'

type Props = {
  defaultSrc: string
  defaultLabel: string
}

/**
 * 添削画面の作業エリア。動画プレイヤーに線引きの層を重ねる
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const ReviewWorkspace = ({ defaultSrc, defaultLabel }: Props) => {
  const editor = useAnnotationEditor()

  return (
    <div className="space-y-3">
      <AnnotationToolbar editor={editor} />
      <LocalVideoPlayer
        defaultSrc={defaultSrc}
        defaultLabel={defaultLabel}
        onSourceChange={editor.reset}
        renderOverlay={({ width, height }) => (
          <AnnotationLayer editor={editor} width={width} height={height} />
        )}
      />
    </div>
  )
}
