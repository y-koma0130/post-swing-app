import 'server-only'

/**
 * thread がほかの feature に公開する関数（ほかの feature は、thread の domain と、このファイルだけを使う）
 */
export { createThread, threadExists } from './infrastructure/repositories/threadRepository'
