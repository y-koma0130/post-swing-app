import { z } from 'zod'
import { parseVideoLink, VIDEO_LINK_HINT } from '../services/parseVideoLink.service'

/** お手本の動画の入力。上げた動画は先に上げてその ID を、YouTube・Instagram は URL を受け取る */
export const drillVideoInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('upload'),
    videoId: z.string().trim().min(1, 'お手本の動画を選んでください'),
  }),
  z.object({
    kind: z.literal('link'),
    url: z.string().transform((url, ctx) => {
      const parsed = parseVideoLink(url)
      if (!parsed) {
        ctx.addIssue({ code: 'custom', message: VIDEO_LINK_HINT })
        return z.NEVER
      }
      return parsed
    }),
  }),
])

export type DrillVideoInput = z.infer<typeof drillVideoInputSchema>

/**
 * ドリル（コーチが登録し、レッスン（添削・チャット）で使い回す練習方法）
 *
 * ドメインルール:
 * - 名前・やり方・お手本の動画で登録する
 * - お手本の動画は、上げた動画か YouTube の動画か Instagram の投稿（DrillVideo）
 */
export const drillInputSchema = z.object({
  title: z.string().trim().min(1, '名前を入れてください').max(50, '名前は50文字までです'),
  description: z.string().trim().max(1000, '説明は1000文字までです'),
  video: drillVideoInputSchema,
})

export type DrillInput = z.infer<typeof drillInputSchema>
