/**
 * 画面に出すコーチの状態（日付は日本時間の YYYY-MM-DD）
 * 文言は画面側の関数（app/features/coach-availability/utils）で組み立てる
 */
export type CoachAvailabilityDto =
  | { kind: 'available'; replyTargetHours: number }
  | {
      kind: 'absent'
      absenceId: string
      startDate: string
      endDate: string
      /** 返信を再開する日（終了日の翌日） */
      resumeDate: string
      note: string
    }
  | { kind: 'delayed' }

/** これから始まる不在（受付ページの「〜は不在の予定です」用） */
export type UpcomingAbsenceDto = { startDate: string; endDate: string; note: string }
