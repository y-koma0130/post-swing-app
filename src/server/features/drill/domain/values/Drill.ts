import { z } from 'zod'

/**
 * ドリル（コーチが登録し、レッスン（添削・チャット）で使い回す練習方法）
 *
 * ドメインルール:
 * - 名前・やり方・お手本の動画で登録する（動画は先に上げておき、その ID を渡す）
 */
export const drillInputSchema = z.object({
  title: z.string().trim().min(1, '名前を入れてください').max(50, '名前は50文字までです'),
  description: z.string().trim().max(1000, '説明は1000文字までです'),
  videoId: z.string().trim().min(1, 'お手本の動画を選んでください'),
})

export type DrillInput = z.infer<typeof drillInputSchema>
