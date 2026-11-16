/** スレッドに出すシステムメッセージ（コーチの不在中に送られたとき） */
export type NewThreadNotice = Readonly<{
  id: string
  threadId: string
  videoId: string
  absenceId: string
  absenceEndDate: string
  createdAt: Date
}>
