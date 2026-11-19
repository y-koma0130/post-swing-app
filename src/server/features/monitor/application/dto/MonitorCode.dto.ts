import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import type { LocalDate } from '@/server/utils/localDate'

/** コーチの設定画面に出すプロモコード */
export type MonitorCodeDto = Readonly<{
  id: string
  code: string
  label: string
  priceYen: number
  maxUses: number
  expiresOn: LocalDate | null
  active: boolean
  /** 申し込んだ数（断られた・期限切れは数えない） */
  usedCount: number
  /** このコードで申し込んだ生徒（申し込み途中なら threadStatus は draft） */
  monitors: ReadonlyArray<{
    studentName: string
    threadId: string | null
    threadStatus: ThreadStatus | null
  }>
}>
