import { z } from 'zod'
import { parseInstagramUrl } from '../services/parseInstagramUrl.service'
import { parseYoutubeUrl } from '../services/parseYoutubeUrl.service'

/** お手本の動画の入力。上げた動画は先に上げてその ID を、YouTube・Instagram は URL を受け取る */
export const drillVideoInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('upload'),
    videoId: z.string().trim().min(1, 'お手本の動画を選んでください'),
  }),
  z.object({
    kind: z.literal('youtube'),
    url: z.string().transform((url, ctx) => {
      const parsed = parseYoutubeUrl(url)
      if (!parsed) {
        ctx.addIssue({
          code: 'custom',
          message: 'YouTube の動画の URL を入れてください（例：https://youtu.be/…）',
        })
        return z.NEVER
      }
      return parsed
    }),
  }),
  z.object({
    kind: z.literal('instagram'),
    url: z.string().transform((url, ctx) => {
      const parsed = parseInstagramUrl(url)
      if (!parsed) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Instagram の投稿かリールの URL を入れてください（例：https://www.instagram.com/reel/…）',
        })
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
