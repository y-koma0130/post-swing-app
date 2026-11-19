'use client'

import { type KeyboardEvent, type MouseEvent, useRef, useState } from 'react'
import { iconButtonClass, segmentClass, segmentGroupClass } from '@/app/components/ui/choiceStyles'

type GuideAngle = 'front' | 'back'

/** ガイドの画像（public/guides）。画像の文字を読み上げ用にも持つ */
const GUIDES = {
  front: {
    tab: '正面',
    src: '/guides/shooting-front.png',
    alt: '正面から撮る：体の正面、ターゲットラインに直角の位置から撮ります。1. カメラは手〜腰の高さ（三脚やバッグのホルダーで固定）2. 約2〜3m離れる（ズームせず、自分が下がる）3. クラブが最後まで画面に入るように 4. ターゲットラインに直角に向ける（ボールの位置が正しく見えます）',
  },
  back: {
    tab: '後方',
    src: '/guides/shooting-back.png',
    alt: '後方から撮る：飛球線の後ろ、手の延長線上から撮ります。1. カメラは手〜腰の高さ（三脚やバッグのホルダーで固定）2. 約2.5〜3.5m離れる（ズームせず、自分が下がる）3. クラブが最後まで画面に入るように 4. ターゲットラインと平行に向ける（ずれると軌道がゆがんで見えます）',
  },
} as const satisfies Record<GuideAngle, { tab: string; src: string; alt: string }>

const ANGLES: GuideAngle[] = ['front', 'back']

type Props = {
  /** 開いたときに見せる角度 */
  angle?: GuideAngle | undefined
  /** ボタンの文言 */
  label?: string | undefined
  className?: string | undefined
}

/**
 * 撮り方のガイド（正面・後方）。小さな文字のボタンだけを置き、押すと画像を重ねて出す。
 *
 * - 提出のドロワーの中からも開けるよう、ブラウザの dialog（いちばん手前に出る）を使う
 * - 画像は開いたときだけ読み込む
 * - Esc・背景・「閉じる」で閉じる。Esc は後ろのドロワーまで閉じないよう、ここで止める
 */
export const ShootingGuide = ({
  angle = 'front',
  label = '撮り方のガイド',
  className = '',
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<GuideAngle>(angle)

  const show = () => {
    setCurrent(angle)
    setOpen(true)
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()

  // 背景（dialog の外側の余白）を押したら閉じる
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') event.stopPropagation()
  }

  const guide = GUIDES[current]
  const next = ANGLES.find((a) => a !== current) ?? 'front'

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={`text-ink decoration-mint inline-flex items-center gap-1 text-sm font-semibold underline decoration-2 underline-offset-4 hover:opacity-80 active:opacity-70 ${className}`}
      >
        <CameraIcon />
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="撮り方のガイド"
        onClose={() => setOpen(false)}
        onClick={onDialogClick}
        onKeyDown={onKeyDown}
        className="bg-surface rounded-card m-auto max-h-[94dvh] w-[min(94vw,30rem)] overflow-hidden p-0 shadow-xl backdrop:bg-black/60"
      >
        <div className="flex max-h-[94dvh] flex-col">
          <div className="border-line-soft flex items-center justify-between gap-3 border-b bg-white px-3 py-2">
            <div role="tablist" aria-label="撮る角度" className={segmentGroupClass}>
              {ANGLES.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={current === a}
                  onClick={() => setCurrent(a)}
                  className={segmentClass(current === a)}
                >
                  {GUIDES[a].tab}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="閉じる"
              className={`${iconButtonClass} text-2xl`}
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {open && (
              <img
                key={current}
                src={guide.src}
                alt={guide.alt}
                width={1080}
                height={1275}
                className="block h-auto w-full"
              />
            )}
          </div>
          <div className="border-line-soft flex gap-2 border-t bg-white p-3">
            <button
              type="button"
              onClick={() => setCurrent(next)}
              className="border-line text-body hover:bg-surface flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold active:scale-[0.97]"
            >
              {GUIDES[next].tab}の撮り方を見る
            </button>
            <button
              type="button"
              onClick={close}
              className="bg-mint text-ink flex-1 rounded-full px-4 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-[0.97]"
            >
              閉じる
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

const CameraIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="text-mint size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)
