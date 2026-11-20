'use client'

import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { textButtonClass } from '@/app/components/ui/Button'
import { type BlurBox, clampBox, type ImageBlur, NEW_BOX_SIZE } from '../utils/blurBoxes'

type Props = {
  imageUrl: string
  /** 画像の呼び方（「1. 正面・トップ」など） */
  title: string
  blur: ImageBlur
  /** 「顔は写っていません」を出すか（顔をぼかす生徒のとき） */
  blurRequired: boolean
  onChange: (blur: ImageBlur) => void
}

type Drag = Readonly<{
  index: number
  mode: 'move' | 'resize'
  startX: number
  startY: number
  start: BlurBox
}>

/**
 * 1枚の画像のぼかしの枠を直す。枠を押して動かし、右下の角で大きさを変える。
 * 自動で見つけた枠も、ここで必ずコーチが確かめる（横顔・帽子・後方からの画像では外れることがある）
 */
export const BlurEditor = ({ imageUrl, title, blur, blurRequired, onChange }: Props) => {
  const frame = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  const setBoxes = (boxes: BlurBox[]) => onChange({ ...blur, boxes })

  const startDrag =
    (index: number, mode: Drag['mode']) => (event: ReactPointerEvent<HTMLElement>) => {
      const box = blur.boxes[index]
      if (!box) return
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      setSelected(index)
      setDrag({ index, mode, startX: event.clientX, startY: event.clientY, start: box })
    }

  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = frame.current?.getBoundingClientRect()
    if (!drag || !rect) return
    const dx = (event.clientX - drag.startX) / rect.width
    const dy = (event.clientY - drag.startY) / rect.height
    const next =
      drag.mode === 'move'
        ? { ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy }
        : { ...drag.start, width: drag.start.width + dx, height: drag.start.height + dy }
    setBoxes(blur.boxes.map((box, i) => (i === drag.index ? clampBox(next) : box)))
  }

  const addBox = () => {
    const half = NEW_BOX_SIZE / 2
    setBoxes([
      ...blur.boxes,
      clampBox({ x: 0.5 - half, y: 0.25 - half, width: NEW_BOX_SIZE, height: NEW_BOX_SIZE }),
    ])
    setSelected(blur.boxes.length)
  }

  const removeSelected = () => {
    if (selected === null) return
    setBoxes(blur.boxes.filter((_, i) => i !== selected))
    setSelected(null)
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        <div className="flex items-center gap-3">
          <button type="button" onClick={addBox} className={textButtonClass()}>
            ＋ぼかしを足す
          </button>
          {selected !== null && (
            <button
              type="button"
              onClick={removeSelected}
              className={textButtonClass({ danger: true })}
            >
              選んだ枠を消す
            </button>
          )}
        </div>
      </div>
      <div ref={frame} className="relative overflow-hidden rounded-xl bg-black select-none">
        <img src={imageUrl} alt={title} className="block w-full" draggable={false} />
        {blur.boxes.map((box, index) => (
          <div
            // 枠は足した順に並び、位置そのものが識別子
            // biome-ignore lint/suspicious/noArrayIndexKey: 並びは足した順で変わらない
            key={index}
            role="presentation"
            onPointerDown={startDrag(index, 'move')}
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
            className={`absolute cursor-move touch-none border-2 bg-white/30 backdrop-blur-sm ${
              selected === index ? 'border-mint' : 'border-white'
            }`}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
          >
            <span
              role="presentation"
              onPointerDown={startDrag(index, 'resize')}
              onPointerMove={onMove}
              onPointerUp={() => setDrag(null)}
              className="bg-mint absolute -right-2 -bottom-2 size-5 cursor-nwse-resize touch-none rounded-full border-2 border-white"
            />
          </div>
        ))}
      </div>
      {blurRequired && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={blur.noFace}
            onChange={(event) => onChange({ ...blur, noFace: event.currentTarget.checked })}
            className="accent-mint"
          />
          この画像に顔は写っていません
        </label>
      )}
    </section>
  )
}
