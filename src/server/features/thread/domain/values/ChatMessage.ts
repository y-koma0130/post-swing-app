import { z } from 'zod'
import {
  drillVideoSchema,
  instagramPostSchema,
  youtubeVideoIdSchema,
} from '@/server/features/drill/domain/values/DrillVideo'
import { keyPositionSchema } from './KeyPosition'
import { videoAngleSchema } from './VideoAngle'

export const chatSenderSchema = z.enum(['coach', 'student'])

export type ChatSender = z.infer<typeof chatSenderSchema>

/**
 * チャットに添えたもの（コーチだけ）。ドリルは送った時点の中身を写して持つ（ドリルを消しても残る）。
 * YouTube はコーチの YouTube の動画で、ダウンロードせず埋め込みで再生する（開始の秒を持てる）。
 * Instagram はコーチの投稿で、Instagram（スマホならアプリ）の投稿を開くリンクにする
 */
export const chatAttachmentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('drill'),
    title: z.string(),
    description: z.string(),
    /** ドリルのお手本の動画（上げた動画か YouTube）。動画のないドリルなら null */
    video: drillVideoSchema.nullable(),
  }),
  z.object({ kind: z.literal('video'), videoId: z.string().min(1) }),
  z.object({
    kind: z.literal('youtube'),
    youtubeId: youtubeVideoIdSchema,
    startSec: z.number().int().nonnegative(),
  }),
  z.object({ kind: z.literal('instagram'), ...instagramPostSchema.shape }),
])

export type ChatAttachment = z.infer<typeof chatAttachmentSchema>

/** 引用できるもの（提出の動画・コーチの動画、添削カード、メッセージ） */
export const quoteKindSchema = z.enum(['video', 'card', 'message'])

export type QuoteKind = z.infer<typeof quoteKindSchema>

/**
 * 引用（LINE のリプライのように、時系列の中のものを指して書く）。
 * 指した先が消えても分かるよう、送った時点の様子を写して持つ
 */
export const chatQuoteSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('video'),
    targetId: z.string().min(1),
    /** 提出の動画なら何回目か（0から）と角度。コーチがチャットで送った動画なら null */
    submissionIndex: z.number().int().nonnegative().nullable(),
    angle: videoAngleSchema.nullable(),
  }),
  z.object({
    kind: z.literal('card'),
    targetId: z.string().min(1),
    submissionIndex: z.number().int().nonnegative(),
    position: keyPositionSchema,
  }),
  z.object({
    kind: z.literal('message'),
    targetId: z.string().min(1),
    from: chatSenderSchema,
    /** 本文の冒頭（本文のない添付だけのメッセージなら、添付の種類） */
    excerpt: z.string(),
  }),
])

export type ChatQuote = z.infer<typeof chatQuoteSchema>

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  from: chatSenderSchema,
  /** 添付だけのメッセージでは空 */
  body: z.string().max(1000),
  sentAt: z.coerce.date(),
  attachment: chatAttachmentSchema,
  quote: chatQuoteSchema.nullable(),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
