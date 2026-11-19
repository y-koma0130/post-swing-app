import { DisclosureToggle, summaryClass } from '@/app/components/ui/DisclosureToggle'

type Props = {
  title: string
  description: string
  /** お手本の動画。動画のないドリルなら null */
  videoUrl: string | null
}

/**
 * ドリル。ふだんはタイトルだけ出し、押すとお手本の動画とやり方が開く（時系列を短く保つ）。
 * 動画は開いたときだけ読み込む
 */
export const DrillDetails = ({ title, description, videoUrl }: Props) =>
  description || videoUrl ? (
    <details className="group bg-mint-soft rounded-xl px-3 py-2">
      {/* 狭いときは、ボタンを下の行に回して名前を折り返さない */}
      <summary className={`${summaryClass} text-ink flex-wrap text-sm font-bold`}>
        <span className="min-w-[8rem] flex-1">ドリル：{title}</span>
        <DisclosureToggle closedLabel={videoUrl ? 'お手本を見る' : 'やり方を見る'} />
      </summary>
      <div className="mt-2 space-y-2">
        {videoUrl && (
          // biome-ignore lint/a11y/useMediaCaption: コーチが撮ったお手本の動画で、字幕はない
          <video
            src={videoUrl}
            controls
            playsInline
            preload="none"
            className="aspect-video w-full rounded-lg bg-black object-contain"
          />
        )}
        {description && <p className="text-caption text-body whitespace-pre-wrap">{description}</p>}
      </div>
    </details>
  ) : (
    <p className="bg-mint-soft text-ink rounded-xl px-3 py-2 text-sm font-bold">ドリル：{title}</p>
  )
