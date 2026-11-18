import 'server-only'
import { z } from 'zod'
import { getActor } from '@/server/auth/getActor'
import { findOwnDrills } from '@/server/features/drill/public'
import { notify } from '@/server/features/notification/public'
import { parseJson } from '@/server/utils/parseJson'
import { authorizeVideo } from '../application/usecases/authorizeVideo.usecase'
import { type SendReplyError, sendReply } from '../application/usecases/sendReply.usecase'
import { reviewCardSchema } from '../domain/values/ReviewCard'
import {
  putMediaObject,
  respondWithMediaObject,
} from '../infrastructure/external-services/videoStorage'
import {
  findStoredCardImage,
  findThread,
  saveReply,
} from '../infrastructure/repositories/threadRepository'

const REPLY_ERROR = {
  not_found: { status: 404, message: '提出が見つかりません' },
  closed: { status: 409, message: 'このスレッドは終了しています' },
  not_started: { status: 409, message: '申し込みを受けてから添削できます' },
  already_replied: {
    status: 409,
    message: 'この提出にはもう添削を返しています。追加の説明はチャットで送ってください',
  },
  no_cards: { status: 400, message: '画像を1枚以上作ってください' },
  too_many_cards: { status: 400, message: '画像は8枚までです' },
  comment_required: { status: 400, message: '説明を書いてください' },
  comment_too_long: { status: 400, message: '説明は2000文字までです' },
  too_many_drills: { status: 400, message: 'ドリルは3つまでです' },
  image_too_large: { status: 413, message: '画像が大きすぎます' },
  invalid_drill: { status: 400, message: '選んだドリルが見つかりません' },
  invalid_video: { status: 400, message: 'この提出の動画から作った画像だけを送れます' },
} as const satisfies Record<SendReplyError, { status: number; message: string }>

/**
 * 添削をまとめて受け取る（multipart）
 * - cards: 画像の中身（JSON）。videoId は画像を作った動画（その提出の正面・後方など）
 * - comment: 全体の説明
 * - drillIds: おすすめのドリル（JSON の配列）
 * - image-0, image-1, …: カードごとの PNG（動画のコマと線を重ねたもの。ブラウザで作る）
 */
export const handleReplySubmit = async (
  request: Request,
  threadId: string,
  submissionId: string
): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return Response.json({ message: 'ログインし直してください' }, { status: 401 })
  }
  const form = await request.formData()
  const rawCards = form.get('cards')
  const cards = z
    .array(reviewCardSchema.extend({ videoId: z.string().min(1) }))
    .safeParse(typeof rawCards === 'string' ? parseJson(rawCards) : null)
  if (!cards.success) {
    return Response.json(
      { message: cards.error.issues[0]?.message ?? 'カードの内容を確かめてください' },
      { status: 400 }
    )
  }
  const rawDrillIds = form.get('drillIds')
  const drillIds = z
    .array(z.string().min(1))
    .safeParse(typeof rawDrillIds === 'string' ? parseJson(rawDrillIds) : [])
  const comment = form.get('comment')
  const images = cards.data.map((_, index) => form.get(`image-${index}`))
  const files = images.filter(
    (image): image is File => image instanceof File && image.type === 'image/png'
  )
  if (files.length !== cards.data.length) {
    return Response.json({ message: 'カードの画像がそろっていません' }, { status: 400 })
  }

  const now = new Date()
  const result = await sendReply(
    {
      actor,
      threadId,
      submissionId,
      cards: cards.data.map((card, index) => ({ ...card, imageBytes: files[index]?.size ?? 0 })),
      comment: typeof comment === 'string' ? comment : '',
      drillIds: drillIds.success ? drillIds.data : [],
      now,
    },
    {
      findThread,
      findOwnDrills,
      storeCardImage: async (r2Key, index) => {
        const file = files[index]
        if (!file) throw new Error(`カード画像がありません: ${index}`)
        await putMediaObject(r2Key, await file.arrayBuffer(), 'image/png')
      },
      saveReply,
      notifyReplySent: ({ threadId: id, studentUserId }) =>
        notify({ kind: 'reply_sent', threadId: id, studentUserId, occurredAt: now.toISOString() }),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    const { status, message } = REPLY_ERROR[result.error]
    return Response.json({ message }, { status })
  }
  return Response.json({ replyId: result.value.replyId }, { status: 201 })
}

/** カード画像を返す。担当のコーチと本人の生徒だけ */
export const handleCardImage = async (request: Request, cardId: string): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return new Response('見つかりません', { status: 404 })
  }
  const result = await authorizeVideo(
    { actor, videoId: cardId },
    { findStoredVideo: findStoredCardImage }
  )
  if (!result.ok) {
    return new Response('見つかりません', { status: 404 })
  }
  return respondWithMediaObject(result.value.r2Key, result.value.contentType, request)
}
