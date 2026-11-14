import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { InviteCoachForm } from '@/app/features/admin/components/InviteCoachForm'
import { formatMonthDay } from '@/app/utils/format'
import { getCoachesForAdmin } from '@/server/features/coach/presentation/queries'

export const metadata: Metadata = { title: '管理画面' }

/** 管理画面。本番は Cloudflare Access の奥に置く */
const AdminPage = async () => {
  const coaches = await getCoachesForAdmin()
  // 管理者でなければ、画面があること自体を知らせない
  if (!coaches) notFound()

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <h1 className="text-xl font-bold">管理画面</h1>

      <Card className="space-y-4">
        <h2 className="font-bold">コーチを招待</h2>
        <InviteCoachForm />
      </Card>

      <Card>
        <h2 className="font-bold">コーチ（{coaches.length}人）</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2 font-normal">名前</th>
              <th className="py-2 font-normal">メール</th>
              <th className="py-2 font-normal">URL</th>
              <th className="py-2 font-normal">決済</th>
              <th className="py-2 font-normal">招待日</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.userId} className="border-t border-gray-100">
                <td className="py-2">{coach.name}</td>
                <td className="py-2">{coach.email}</td>
                <td className="py-2">
                  <a href={`/c/${coach.slug}`} className="underline">
                    /c/{coach.slug}
                  </a>
                </td>
                <td className="py-2">{coach.chargesEnabled ? '受付可' : '口座未設定'}</td>
                <td className="py-2">{formatMonthDay(coach.invitedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  )
}

export default AdminPage
