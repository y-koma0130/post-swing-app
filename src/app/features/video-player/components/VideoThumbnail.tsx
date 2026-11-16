type Props = {
  src: string
  /** 左上に出す呼び方（「正面」など） */
  label: string
  onOpen: () => void
}

/** 動画の小さな見本（最初のコマ）。押すと大きく開く */
export const VideoThumbnail = ({ src, label, onOpen }: Props) => (
  <button
    type="button"
    onClick={onOpen}
    className="relative block w-full overflow-hidden rounded-lg bg-black"
    aria-label={`${label}を開く`}
  >
    {/* 最初のコマだけを読み、見本にする */}
    <video
      src={`${src}#t=0.1`}
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
)
