import 'server-only'
import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Db = ReturnType<typeof getDb>

/** D1 への接続。infrastructure と auth からだけ使う */
export const getDb = () => drizzle(env.DB, { schema, casing: 'snake_case' })
