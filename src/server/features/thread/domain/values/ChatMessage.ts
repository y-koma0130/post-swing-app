import { z } from 'zod'

export const chatSenderSchema = z.enum(['coach', 'student'])

export type ChatSender = z.infer<typeof chatSenderSchema>

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  videoId: z.string().min(1),
  from: chatSenderSchema,
  body: z.string().min(1).max(1000),
  sentAt: z.coerce.date(),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
