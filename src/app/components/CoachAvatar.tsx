type Props = {
  name: string
  url: string | null
  /** 直径（px） */
  size: number
}

/** コーチのプロフィール画像。なければ名前の頭文字を丸の中に出す */
export const CoachAvatar = ({ name, url, size }: Props) =>
  url ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="bg-mint-soft text-ink flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {[...name.trim()][0] ?? '?'}
    </span>
  )
