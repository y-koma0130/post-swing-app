/**
 * 操作している人。ユースケースにはこれだけを渡し、Cookie やトークンは知らせない
 * （Web の Cookie でも、将来のアプリのトークンでも同じ形にする）
 */
export type Actor = Readonly<{
  userId: string
  name: string
}>
