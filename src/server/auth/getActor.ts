import 'server-only'
import { headers } from 'next/headers'
import type { Actor } from '@/server/utils/actor'
import { getAuth } from './auth'

export type { Actor }

/** ログインしていなければ null */
export const getActor = async (): Promise<Actor | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return null
  }
  return { userId: session.user.id, name: session.user.name }
}
