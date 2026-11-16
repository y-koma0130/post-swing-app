import 'server-only'

/**
 * drill がほかの feature に公開する関数（ほかの feature は、drill の domain と、このファイルだけを使う）
 */

/** カードに付けたりチャットで送ったりできるのは、そのコーチ自身のドリルだけ */
export {
  findOwnDrill,
  findOwnDrillIds,
  findOwnDrills,
} from './infrastructure/repositories/drillRepository'
