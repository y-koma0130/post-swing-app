import { z } from 'zod'
import { reviewCardSchema } from './ReviewCard'

export const swingVideoSchema = z.object({
  id: z.string().min(1),
  uploadedAt: z.coerce.date(),
  note: z.string().max(1000),
  cards: z.array(reviewCardSchema),
})

export type SwingVideo = z.infer<typeof swingVideoSchema>
