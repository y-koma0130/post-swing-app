import 'server-only'
import { headers } from 'next/headers'
import { getAuth } from './auth'

/**
 * 操作している人。ユースケースにはこれだけを渡し、Cookie やトークンは知らせない
 */
export type Actor = Readonly<{
  userId: string
  name: string
}>

/** ログインしていなければ null */
export const getActor = async (): Promise<Actor | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return null
  }
  return { userId: session.user.id, name: session.user.name }
}
