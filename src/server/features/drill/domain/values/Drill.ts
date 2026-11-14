import { z } from 'zod'

/**
 * ドリル（コーチが登録し、添削カードに添えて使い回す練習方法）
 */
export const drillInputSchema = z.object({
  title: z.string().trim().min(1, '名前を入れてください').max(50, '名前は50文字までです'),
  description: z.string().trim().max(1000, '説明は1000文字までです'),
})

export type DrillInput = z.infer<typeof drillInputSchema>
