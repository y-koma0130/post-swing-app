import { z } from 'zod'

/**
 * スイングのキー位置
 */
export const keyPositionSchema = z.enum(['address', 'top', 'impact', 'finish'])

export type KeyPosition = z.infer<typeof keyPositionSchema>
