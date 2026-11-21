/**
 * 画面で再生するお手本の動画
 * - upload：コーチが上げた動画。url は Route Handler（見てよいかはそこで確かめる）
 * - youtube：YouTube の埋め込みで再生する
 */
export type DrillVideoDto =
  | { kind: 'upload'; url: string }
  | { kind: 'youtube'; youtubeId: string; startSec: number }

/** コーチのドリル一覧・添削カードでの選択肢 */
export type DrillDto = {
  id: string
  title: string
  description: string
  /** お手本の動画。動画が必須になる前に登録したドリルは null */
  video: DrillVideoDto | null
}
