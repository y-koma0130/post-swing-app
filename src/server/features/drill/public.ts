import 'server-only'

/**
 * drill がほかの feature に公開する関数（ほかの feature は、drill の domain と、このファイルだけを使う）
 */

/** カードに付けられるのは、そのコーチ自身のドリルだけ */
export { findOwnDrillIds } from './infrastructure/repositories/drillRepository'
