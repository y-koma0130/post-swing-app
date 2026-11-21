import 'server-only'

/**
 * drill がほかの feature に公開する関数（ほかの feature は、drill の domain と、このファイルだけを使う）
 */

/** YouTube の動画を埋め込みで再生できるか（チャットで YouTube を送るときにも確かめる） */
export { checkYoutubeEmbed } from './infrastructure/external-services/checkYoutubeEmbed'

/** 写したドリルのお手本の動画を、画面で再生する形にする */
export { toDrillVideoDto } from './infrastructure/query-services/drillVideoView'
/** カードに付けたりチャットで送ったりできるのは、そのコーチ自身のドリルだけ */
export {
  findOwnDrill,
  findOwnDrillIds,
  findOwnDrills,
} from './infrastructure/repositories/drillRepository'
