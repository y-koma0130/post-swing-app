import { z } from 'zod'

export const threadIdSchema = z.string().min(1).brand<'ThreadId'>()

export type ThreadId = z.infer<typeof threadIdSchema>
