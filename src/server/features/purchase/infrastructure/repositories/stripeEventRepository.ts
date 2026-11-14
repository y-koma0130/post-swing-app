import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { stripeEvent } from '@/server/db/schema'

export type IsStripeEventProcessed = (eventId: string) => Promise<boolean>
export const isStripeEventProcessed: IsStripeEventProcessed = async (eventId) => {
  const row = await getDb()
    .select({ id: stripeEvent.id })
    .from(stripeEvent)
    .where(eq(stripeEvent.id, eventId))
    .get()
  return row !== undefined
}

export type MarkStripeEventProcessed = (event: { id: string; type: string }) => Promise<void>
export const markStripeEventProcessed: MarkStripeEventProcessed = async (event) => {
  await getDb()
    .insert(stripeEvent)
    .values({ id: event.id, type: event.type, processedAt: new Date() })
    .onConflictDoNothing()
}
