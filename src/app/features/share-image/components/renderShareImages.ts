import type { BlurBox } from '../utils/blurBoxes'
import {
  FEED_SIZE,
  fitContain,
  type Rect,
  SHARE_COLORS,
  STORY_SIZE,
  STORY_STICKER_SPACE,
  wrapText,
} from '../utils/shareLayout'

const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif'
const font = (size: number, weight: 'bold' | 'normal' = 'bold') => `${weight} ${size}px ${FONT}`

/** 画像を読み込む（同じサイトの URL なので、Canvas に描いても書き出せる） */
export const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('画像を読み込めませんでした'))
    image.src = url
  })

const newCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像を作れませんでした')
  return { canvas, ctx }
}

/**
 * 添削の画像に、ぼかしの枠の部分だけモザイクをかけた写しを作る（元の画像は変えない）。
 * モザイクの細かさは枠の大きさに合わせる（小さい顔でも、目鼻が読めない粗さにする）
 */
export const prepareImage = (
  image: HTMLImageElement,
  boxes: ReadonlyArray<BlurBox>
): HTMLCanvasElement => {
  const { canvas, ctx } = newCanvas(image.naturalWidth, image.naturalHeight)
  ctx.drawImage(image, 0, 0)
  for (const box of boxes) {
    const x = Math.round(box.x * canvas.width)
    const y = Math.round(box.y * canvas.height)
    const width = Math.max(1, Math.round(box.width * canvas.width))
    const height = Math.max(1, Math.round(box.height * canvas.height))
    // 枠の短い辺を8マスくらいに分ける
    const cell = Math.max(4, Math.round(Math.min(width, height) / 8))
    const small = newCanvas(
      Math.max(1, Math.ceil(width / cell)),
      Math.max(1, Math.ceil(height / cell))
    )
    small.ctx.drawImage(canvas, x, y, width, height, 0, 0, small.canvas.width, small.canvas.height)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small.canvas, 0, 0, small.canvas.width, small.canvas.height, x, y, width, height)
    ctx.restore()
  }
  return canvas
}

/** 右下の「swingpost」（外せない） */
const drawLogo = (ctx: CanvasRenderingContext2D, width: number, height: number, onDark = false) => {
  const size = 34
  ctx.font = font(size)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const swing = 'swing'
  const post = 'post'
  const total = ctx.measureText(swing + post).width
  const x = width - 48 - total
  const y = height - 44
  ctx.fillStyle = onDark ? SHARE_COLORS.white : SHARE_COLORS.ink
  ctx.fillText(swing, x, y)
  ctx.fillStyle = onDark ? SHARE_COLORS.white : SHARE_COLORS.mintText
  ctx.fillText(post, x + ctx.measureText(swing).width, y)
}

const drawLines = (
  ctx: CanvasRenderingContext2D,
  lines: ReadonlyArray<string>,
  x: number,
  y: number,
  lineHeight: number
) => {
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })
}

/** 画像を角丸の枠に収めて描く */
const drawFramedImage = (ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, box: Rect) => {
  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.roundRect(box.x, box.y, box.width, box.height, 28)
  ctx.fill()
  ctx.clip()
  const rect = fitContain({ width: image.width, height: image.height }, box)
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像を作れませんでした'))
    }, 'image/png')
  })

export type ShareCard = Readonly<{
  /** ぼかしをかけた画像（prepareImage） */
  image: HTMLCanvasElement
  /** キー位置の呼び方（「トップ」など） */
  positionLabel: string
  /** 画像に添える一言（元の添削から短く直したもの） */
  comment: string
}>

export type FeedInput = Readonly<{
  headline: string
  /** 生徒の一言（「40代・平均スコア98」）。なければ null */
  studentLabel: string | null
  cards: ReadonlyArray<ShareCard>
  /** 直したいところ（スレッドのテーマ） */
  theme: string
  drillTitles: ReadonlyArray<string>
  /** 最後のページに出すアカウント（「@yamada_golf」）。なければコーチの名前 */
  account: string
}>

const { width: W, height: H } = FEED_SIZE
const PAD = 72

const renderCover = (input: FeedInput) => {
  const { canvas, ctx } = newCanvas(W, H)
  ctx.fillStyle = SHARE_COLORS.mintSoft
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = SHARE_COLORS.mintText
  ctx.font = font(34)
  ctx.textBaseline = 'top'
  ctx.fillText('SWING CHECK', PAD, PAD)
  ctx.fillStyle = SHARE_COLORS.ink
  ctx.font = font(76)
  const title = wrapText(input.headline, W - PAD * 2, 2, (v) => ctx.measureText(v).width)
  drawLines(ctx, title, PAD, PAD + 56, 96)
  let top = PAD + 56 + title.length * 96 + 12
  if (input.studentLabel) {
    ctx.fillStyle = SHARE_COLORS.body
    ctx.font = font(38, 'normal')
    ctx.fillText(input.studentLabel, PAD, top)
    top += 60
  }
  const first = input.cards[0]
  if (first) {
    drawFramedImage(ctx, first.image, {
      x: PAD,
      y: top + 16,
      width: W - PAD * 2,
      height: H - top - 16 - 120,
    })
  }
  drawLogo(ctx, W, H)
  return canvas
}

const renderCardSlide = (card: ShareCard, index: number, total: number) => {
  const { canvas, ctx } = newCanvas(W, H)
  ctx.fillStyle = SHARE_COLORS.white
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  // 上に「1 / 3」とキー位置
  ctx.fillStyle = SHARE_COLORS.mintText
  ctx.font = font(36)
  ctx.fillText(`${index + 1} / ${total}　${card.positionLabel}`, PAD, PAD - 16)
  const imageBox = { x: PAD, y: PAD + 48, width: W - PAD * 2, height: 860 }
  drawFramedImage(ctx, card.image, imageBox)
  if (card.comment.trim() !== '') {
    ctx.fillStyle = SHARE_COLORS.ink
    ctx.font = font(44)
    const lines = wrapText(card.comment, W - PAD * 2, 4, (v) => ctx.measureText(v).width)
    drawLines(ctx, lines, PAD, imageBox.y + imageBox.height + 40, 62)
  }
  drawLogo(ctx, W, H)
  return canvas
}

const renderSummary = (input: FeedInput) => {
  const { canvas, ctx } = newCanvas(W, H)
  ctx.fillStyle = SHARE_COLORS.white
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  ctx.fillStyle = SHARE_COLORS.mintText
  ctx.font = font(36)
  ctx.fillText('今回のまとめ', PAD, PAD)
  ctx.fillStyle = SHARE_COLORS.muted
  ctx.font = font(34, 'normal')
  ctx.fillText('悩み', PAD, PAD + 110)
  ctx.fillStyle = SHARE_COLORS.ink
  ctx.font = font(56)
  const theme = wrapText(
    input.theme || 'スイングの添削',
    W - PAD * 2,
    3,
    (v) => ctx.measureText(v).width
  )
  drawLines(ctx, theme, PAD, PAD + 164, 76)
  let top = PAD + 164 + theme.length * 76 + 80
  if (input.drillTitles.length > 0) {
    ctx.fillStyle = SHARE_COLORS.muted
    ctx.font = font(34, 'normal')
    ctx.fillText('おすすめのドリル', PAD, top)
    top += 64
    ctx.font = font(44)
    for (const title of input.drillTitles.slice(0, 3)) {
      ctx.fillStyle = SHARE_COLORS.mint
      ctx.beginPath()
      ctx.arc(PAD + 14, top + 26, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = SHARE_COLORS.ink
      const lines = wrapText(title, W - PAD * 2 - 48, 2, (v) => ctx.measureText(v).width)
      drawLines(ctx, lines, PAD + 48, top, 60)
      top += lines.length * 60 + 28
    }
  }
  drawLogo(ctx, W, H)
  return canvas
}

const renderCallToAction = (input: FeedInput) => {
  const { canvas, ctx } = newCanvas(W, H)
  ctx.fillStyle = SHARE_COLORS.mint
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = SHARE_COLORS.ink
  ctx.font = font(64)
  drawLines(ctx, ['スイングの添削、', '受け付けています'], W / 2, H / 2 - 170, 92)
  ctx.font = font(40, 'normal')
  ctx.fillText('お申し込みはプロフィールのリンクから', W / 2, H / 2 + 50)
  ctx.font = font(48)
  ctx.fillText(input.account, W / 2, H / 2 + 170)
  ctx.textAlign = 'left'
  drawLogo(ctx, W, H)
  return canvas
}

/** フィード用のカルーセル（表紙・添削の画像・まとめ・最後）を PNG にする */
export const renderFeedSlides = async (input: FeedInput): Promise<Blob[]> => {
  const canvases = [
    renderCover(input),
    ...input.cards.map((card, i) => renderCardSlide(card, i, input.cards.length)),
    renderSummary(input),
    renderCallToAction(input),
  ]
  return Promise.all(canvases.map(toBlob))
}

export type StoryInput = Readonly<{
  card: ShareCard
  /** 上に出すひとこと */
  caption: string
}>

/** ストーリーズ用の1枚。下はリンクのスタンプを貼る余白にする */
export const renderStory = async ({ card, caption }: StoryInput): Promise<Blob> => {
  const { width, height } = STORY_SIZE
  const { canvas, ctx } = newCanvas(width, height)
  ctx.fillStyle = SHARE_COLORS.mintSoft
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = 'top'
  ctx.fillStyle = SHARE_COLORS.ink
  ctx.font = font(60)
  const lines = wrapText(caption, width - PAD * 2, 3, (v) => ctx.measureText(v).width)
  drawLines(ctx, lines, PAD, PAD + 40, 84)
  const top = PAD + 40 + lines.length * 84 + 48
  drawFramedImage(ctx, card.image, {
    x: PAD,
    y: top,
    width: width - PAD * 2,
    height: height - top - STORY_STICKER_SPACE,
  })
  drawLogo(ctx, width, height)
  return toBlob(canvas)
}
