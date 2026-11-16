import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { CoachSuspendButton } from '@/app/features/admin/components/CoachSuspendButton'
import { InviteCoachForm } from '@/app/features/admin/components/InviteCoachForm'
import { RefundThreadButton } from '@/app/features/admin/components/RefundThreadButton'
import { formatMonthDay, formatYen } from '@/app/utils/format'
import { getCoachesForAdmin } from '@/server/features/coach/presentation/queries'
import type { AdminThreadRowDto } from '@/server/features/thread/application/dto/AdminThreadRow.dto'
import { getThreadsForAdmin } from '@/server/features/thread/presentation/queries'

export const metadata: Metadata = { title: '管理画面' }

const DAY_MS = 24 * 60 * 60 * 1000

const PLAN_LABEL = { trial: 'お試し', single: '1スレッド', monthly: '月額' } as const
const STATUS_LABEL = {
  waiting_coach: '添削待ち',
  waiting_student: '生徒の番',
  closed: '終了',
} as const

/** 返信を待たせている日数。待たせていなければ null */
const waitingDays = (row: AdminThreadRowDto, now: Date): number | null =>
  row.oldestUnrepliedAt === null || row.status === 'closed'
    ? null
    : Math.floor((now.getTime() - row.oldestUnrepliedAt.getTime()) / DAY_MS)

/** 管理画面。本番は Cloudflare Access の奥に置く */
const AdminPage = async () => {
  const [coaches, threads] = await Promise.all([getCoachesForAdmin(), getThreadsForAdmin()])
  // 管理者でなければ、画面があること自体を知らせない
  if (!coaches || !threads) notFound()
  const now = new Date()

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <h1 className="text-title">管理画面</h1>

      <Card className="space-y-4">
        <h2 className="text-heading">コーチを招待</h2>
        <InviteCoachForm />
      </Card>

      <Card>
        <h2 className="text-heading">コーチ（{coaches.length}人）</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-normal">名前</th>
              <th className="py-2 font-normal">メール</th>
              <th className="py-2 font-normal">URL</th>
              <th className="py-2 font-normal">決済</th>
              <th className="py-2 font-normal">受付</th>
              <th className="py-2 font-normal">招待日</th>
              <th className="py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.userId} className="border-line-soft border-t align-top">
                <td className="py-2">{coach.name}</td>
                <td className="py-2">{coach.email}</td>
                <td className="py-2">
                  <a href={`/c/${coach.slug}`} className="underline">
                    /c/{coach.slug}
                  </a>
                </td>
                <td className="py-2">{coach.chargesEnabled ? '受付可' : '口座未設定'}</td>
                <td className={`py-2 ${coach.suspended ? 'text-danger font-bold' : ''}`}>
                  {coach.suspended ? '停止中' : '受付中'}
                </td>
                <td className="py-2">{formatMonthDay(coach.invitedAt)}</td>
                <td className="py-2">
                  <CoachSuspendButton
                    coachUserId={coach.userId}
                    coachName={coach.name}
                    suspended={coach.suspended}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="text-heading">スレッド（新しく動いた順に{threads.length}件）</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-normal">コーチ</th>
              <th className="py-2 font-normal">生徒</th>
              <th className="py-2 font-normal">プラン</th>
              <th className="py-2 font-normal">状態</th>
              <th className="py-2 font-normal">返信待ち</th>
              <th className="py-2 font-normal">期間</th>
              <th className="py-2 font-normal">支払い</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((row) => {
              const days = waitingDays(row, now)
              return (
                <tr key={row.id} className="border-line-soft border-t align-top">
                  <td className="py-2">{row.coachName}</td>
                  <td className="py-2">{row.studentName || '（名前なし）'}</td>
                  <td className="py-2">
                    {PLAN_LABEL[row.planKind]}・{formatYen(row.priceYen)}
                  </td>
                  <td className="py-2">{STATUS_LABEL[row.status]}</td>
                  <td
                    className={`py-2 ${days !== null && days >= 3 ? 'text-danger font-bold' : ''}`}
                  >
                    {days === null ? '—' : `${days}日`}
                  </td>
                  <td className="py-2">
                    {formatMonthDay(row.startedAt)}〜{formatMonthDay(row.expiresAt)}
                  </td>
                  <td className="py-2">
                    {row.refundedAt ? (
                      <span className="text-muted">
                        返金済み（{formatMonthDay(row.refundedAt)}）
                      </span>
                    ) : (
                      <RefundThreadButton
                        threadId={row.id}
                        studentName={row.studentName || '生徒'}
                        priceYen={row.priceYen}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </main>
  )
}

export default AdminPage
