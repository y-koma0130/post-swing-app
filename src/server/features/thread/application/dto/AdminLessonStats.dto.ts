/** 管理画面のレッスンと生徒の数（デモのコーチのものは数えない） */
export type AdminLessonStatsDto = {
  lessons: {
    /** コーチの承認待ちの申し込み */
    requested: number
    /** 進行中（添削待ち・レッスン中） */
    inLesson: number
    /** 今月始まった（承認して始まったもの。日本時間の月） */
    startedThisMonth: number
    /** 終わった（これまでの合計） */
    finished: number
  }
  students: {
    /** レッスンを始めたことのある生徒（申し込みだけ・断られただけの人は数えない） */
    total: number
    /** いまレッスン中の生徒 */
    active: number
    /** 今月はじめてレッスンを始めた生徒 */
    newThisMonth: number
  }
}
