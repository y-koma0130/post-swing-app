import { z } from 'zod'

/**
 * 動画上の座標。解像度に依存しないよう 0〜1 に正規化する
 */
export const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})

export type NormalizedPoint = z.infer<typeof normalizedPointSchema>

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

/**
 * 添削カード上の線
 */
export const annotationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['line', 'arrow']),
    from: normalizedPointSchema,
    to: normalizedPointSchema,
    color: colorSchema,
  }),
  z.object({
    kind: z.literal('circle'),
    center: normalizedPointSchema,
    // 縦動画と横動画で同じ円になるよう、動画の幅を 1 とした値で持つ
    radius: z.number().positive().max(1),
    color: colorSchema,
  }),
  z.object({
    kind: z.literal('free'),
    points: z.array(normalizedPointSchema).min(2),
    color: colorSchema,
  }),
])

export type Annotation = z.infer<typeof annotationSchema>
