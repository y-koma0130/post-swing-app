'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, textButtonClass } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { Notice } from '@/app/components/ui/Notice'
import { useFaceDetector } from '../hooks/useFaceDetector'
import { blurCheckPassed, type ImageBlur } from '../utils/blurBoxes'
import { DEFAULT_HEADLINE, MAX_CARD_SLIDES } from '../utils/shareLayout'
import { BlurEditor } from './BlurEditor'
import { loadImage, prepareImage, renderFeedSlides, renderStory } from './renderShareImages'

export type ShareSourceCard = Readonly<{
  id: string
  imageUrl: string
  /** 画面での呼び方（「1. 正面・トップ」） */
  title: string
  /** 画像に出すキー位置（「トップ」） */
  positionLabel: string
  /** 添削で書いた一言（シェア用に短く直せる。元の添削は変えない） */
  comment: string
}>

type Props = {
  cards: ReadonlyArray<ShareSourceCard>
  theme: string
  drillTitles: ReadonlyArray<string>
  /** 画像に出す生徒の一言（「40代・平均スコア98」）。なければ null */
  studentLabel: string | null
  /** 生徒が顔を出してよいと選んだか（false なら、ぼかしが必須） */
  showFaceAllowed: boolean
  /** 最後のページに出すアカウント */
  account: string
}

type Output = Readonly<{ feed: File[]; story: File; urls: string[] }>

const NO_BLUR: ImageBlur = { boxes: [], noFace: false }
const COMMENT_MAX = 80

/**
 * 返した添削から、インスタ用の画像を作る（フィードのカルーセルとストーリーズ）。
 * 画像の処理はすべてこのブラウザの中で行い、サーバーには送らない
 */
export const ShareImageBuilder = ({
  cards,
  theme,
  drillTitles,
  studentLabel,
  showFaceAllowed,
  account,
}: Props) => {
  const [order, setOrder] = useState<string[]>(() =>
    cards.slice(0, MAX_CARD_SLIDES).map((c) => c.id)
  )
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(cards.map((c) => [c.id, c.comment.slice(0, COMMENT_MAX)]))
  )
  const [blurs, setBlurs] = useState<Record<string, ImageBlur>>({})
  const [blurFaces, setBlurFaces] = useState(true)
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE)
  const [caption, setCaption] = useState(theme ? `今回の悩み：${theme}` : DEFAULT_HEADLINE)
  const [making, setMaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<Output | null>(null)
  const { status: detector, detectFaces } = useFaceDetector()
  const blurRequired = !showFaceAllowed
  const applyBlur = blurRequired || blurFaces

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const selected = order.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })

  // 自動で顔を探す（まだ枠を付けていない画像だけ。見つけた枠はコーチが確かめる）
  useEffect(() => {
    if (detector !== 'ready') return
    let cancelled = false
    const run = async () => {
      for (const card of cards) {
        try {
          const image = await loadImage(card.imageUrl)
          const boxes = detectFaces(image)
          if (cancelled) return
          setBlurs((prev) =>
            prev[card.id] ? prev : { ...prev, [card.id]: { boxes, noFace: false } }
          )
        } catch {
          // 読めなかった画像は、手で枠を付ける
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [detector, cards, detectFaces])

  // 作った画像の URL は、作り直したとき・画面を離れるときに手放す
  useEffect(() => {
    return () => {
      for (const url of output?.urls ?? []) URL.revokeObjectURL(url)
    }
  }, [output])

  const toggle = (id: string) => {
    setOutput(null)
    setOrder((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_CARD_SLIDES
          ? prev
          : [...prev, id]
    )
  }

  const move = (id: string, delta: -1 | 1) => {
    setOutput(null)
    setOrder((prev) => {
      const index = prev.indexOf(id)
      const target = index + delta
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      next[index] = prev[target] ?? id
      next[target] = id
      return next
    })
  }

  const make = async () => {
    setError(null)
    if (selected.length === 0) {
      setError('使う画像を1枚以上選んでください')
      return
    }
    const imageBlurs = selected.map((card) => blurs[card.id] ?? NO_BLUR)
    if (!blurCheckPassed(imageBlurs, blurRequired)) {
      setError(
        'ぼかしの枠がない画像があります。顔をぼかすか、「この画像に顔は写っていません」にチェックを付けてください'
      )
      return
    }
    setMaking(true)
    try {
      const prepared = await Promise.all(
        selected.map(async (card) => ({
          image: prepareImage(
            await loadImage(card.imageUrl),
            applyBlur ? (blurs[card.id] ?? NO_BLUR).boxes : []
          ),
          positionLabel: card.positionLabel,
          comment: comments[card.id] ?? '',
        }))
      )
      const first = prepared[0]
      if (!first) return
      const [feedBlobs, storyBlob] = await Promise.all([
        renderFeedSlides({
          headline,
          studentLabel,
          cards: prepared,
          theme,
          drillTitles,
          account,
        }),
        renderStory({ card: first, caption }),
      ])
      const feed = feedBlobs.map(
        (blob, i) => new File([blob], `swingpost-${i + 1}.png`, { type: 'image/png' })
      )
      const story = new File([storyBlob], 'swingpost-story.png', { type: 'image/png' })
      setOutput({ feed, story, urls: [...feed, story].map((file) => URL.createObjectURL(file)) })
    } catch {
      setError('画像を作れませんでした。もう一度お試しください')
    } finally {
      setMaking(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-heading">使う画像</h2>
          <p className="text-caption text-muted">
            {MAX_CARD_SLIDES}枚まで。一言はシェア用に短くできます（元の添削は変わりません）
          </p>
        </div>
        <ul className="space-y-3">
          {cards.map((card) => {
            const position = order.indexOf(card.id)
            const on = position >= 0
            return (
              <li key={card.id} className="border-line-soft space-y-2 rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(card.id)}
                    aria-label={`${card.title}を使う`}
                    className="accent-mint"
                  />
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="h-14 w-10 rounded bg-black object-contain"
                  />
                  <span className="min-w-0 flex-1 text-sm font-bold">
                    {on ? `${position + 1}枚目：` : ''}
                    {card.title}
                  </span>
                  {on && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(card.id, -1)}
                        aria-label="前へ"
                        className={textButtonClass()}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(card.id, 1)}
                        aria-label="後ろへ"
                        className={textButtonClass()}
                      >
                        ↓
                      </button>
                    </span>
                  )}
                </div>
                {on && (
                  <textarea
                    value={comments[card.id] ?? ''}
                    maxLength={COMMENT_MAX}
                    rows={2}
                    onChange={(event) => {
                      setOutput(null)
                      setComments((prev) => ({ ...prev, [card.id]: event.currentTarget.value }))
                    }}
                    aria-label={`${card.title}の一言`}
                    className={inputClass}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-heading">顔のぼかし</h2>
          <p className="text-caption text-muted">
            {detector === 'loading'
              ? '顔を自動で探しています…'
              : detector === 'ready'
                ? '自動で顔を探して、見つけた顔に枠を付けました。見落としや外れがあるので、すべての画像を確かめてください'
                : '自動で探せませんでした。枠を足して、顔を隠してください'}
          </p>
        </div>
        {showFaceAllowed ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={blurFaces}
              onChange={(event) => {
                setOutput(null)
                setBlurFaces(event.currentTarget.checked)
              }}
              className="accent-mint"
            />
            顔をぼかす（生徒は顔を出してよいと選んでいます）
          </label>
        ) : (
          <Notice tone="warning">
            <p>
              生徒は「顔をぼかす」を選んでいます。すべての画像で、顔が隠れていることを確かめてください。
            </p>
          </Notice>
        )}
        {applyBlur &&
          selected.map((card) => (
            <BlurEditor
              key={card.id}
              imageUrl={card.imageUrl}
              title={card.title}
              blur={blurs[card.id] ?? NO_BLUR}
              blurRequired={blurRequired}
              onChange={(blur) => {
                setOutput(null)
                setBlurs((prev) => ({ ...prev, [card.id]: blur }))
              }}
            />
          ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-heading">文字</h2>
        <label className="block space-y-1">
          <span className={labelTextClass}>表紙の見出し</span>
          <input
            value={headline}
            maxLength={30}
            onChange={(event) => {
              setOutput(null)
              setHeadline(event.currentTarget.value)
            }}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelTextClass}>ストーリーズのひとこと</span>
          <input
            value={caption}
            maxLength={40}
            onChange={(event) => {
              setOutput(null)
              setCaption(event.currentTarget.value)
            }}
            className={inputClass}
          />
        </label>
        <p className="text-caption text-muted">
          生徒について出すのは「{studentLabel ?? 'なし'}」だけです。名前は出しません。
        </p>
      </Card>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button size="lg" className="w-full" pending={making} onClick={make}>
        {making ? '画像を作っています…' : '画像を作る'}
      </Button>

      {output && <ShareOutput output={output} />}
    </div>
  )
}

/** 作った画像の確認と書き出し（スマホは共有のシートから、PC はダウンロード） */
const ShareOutput = ({ output }: { output: Output }) => {
  const [message, setMessage] = useState<string | null>(null)
  const canShare = (files: File[]) =>
    typeof navigator !== 'undefined' && navigator.canShare?.({ files }) === true

  const share = async (files: File[]) => {
    setMessage(null)
    if (canShare(files)) {
      try {
        await navigator.share({ files })
      } catch {
        // 共有のシートを閉じたときも、ここに来る
      }
      return
    }
    for (const file of files) {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      URL.revokeObjectURL(url)
    }
    setMessage('画像をダウンロードしました')
  }

  const feedUrls = output.urls.slice(0, output.feed.length)
  const storyUrl = output.urls[output.feed.length]
  return (
    <Card className="space-y-4">
      <h2 className="text-heading">できた画像</h2>
      <div className="space-y-2">
        <p className="text-sm font-bold">フィード（{output.feed.length}枚のカルーセル）</p>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {feedUrls.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`${i + 1}枚目`}
              className="border-line w-40 shrink-0 snap-start rounded-lg border"
            />
          ))}
        </div>
        <Button className="w-full" onClick={() => share(output.feed)}>
          {canShare(output.feed) ? 'インスタなどに送る（フィード）' : 'フィード用をダウンロード'}
        </Button>
      </div>
      {storyUrl && (
        <div className="space-y-2">
          <p className="text-sm font-bold">ストーリーズ</p>
          <img src={storyUrl} alt="ストーリーズ" className="border-line w-40 rounded-lg border" />
          <Button variant="secondary" className="w-full" onClick={() => share([output.story])}>
            {canShare([output.story])
              ? 'インスタなどに送る（ストーリーズ）'
              : 'ストーリーズ用をダウンロード'}
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-caption text-muted">
          {message}
        </p>
      )}
    </Card>
  )
}
