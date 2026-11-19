import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'

/** カルテの中身（コーチだけが見る） */
export type StudentChartDto = {
  studentUserId: string
  studentName: string
  memo: string
  tags: string[]
  /** メモ・タグを最後に保存した日時。まだ書いていなければ null */
  updatedAt: Date | null
  /** レッスンの記録（新しい順） */
  entries: Array<{
    id: string
    body: string
    createdAt: Date
    /** どのスレッドのときに書いたか。なければ null */
    thread: { id: string; theme: string } | null
  }>
  /** これまでのスレッド（新しい順。申し込みの下書きは除く） */
  threads: Array<{ id: string; theme: string; status: ThreadStatus; startedAt: Date }>
  /** これまでに送ったドリル（新しい順。添削とチャットの両方） */
  drills: Array<{ title: string; sentAt: Date; threadId: string }>
}

/** 生徒の一覧の1行 */
export type StudentListItemDto = {
  studentUserId: string
  name: string
  tags: string[]
  threadCount: number
  /** レッスン中（承認待ち・添削待ち・レッスン中）のスレッドがあるか */
  inLesson: boolean
  /** いちばん最近のスレッドが動いた日時 */
  lastActivityAt: Date
}
