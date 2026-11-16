import { getAuth } from '@/server/auth/auth'

/** Better Auth の API（ログイン・ログアウト・コード送信など）をまとめて受ける */
const handler = (request: Request) => getAuth().handler(request)

export const GET = handler
export const POST = handler
