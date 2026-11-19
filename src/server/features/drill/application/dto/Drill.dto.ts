/** コーチのドリル一覧・添削カードでの選択肢 */
export type DrillDto = {
  id: string
  title: string
  description: string
  /** お手本の動画（drill_video）。動画が必須になる前に登録したドリルは null */
  videoId: string | null
}
