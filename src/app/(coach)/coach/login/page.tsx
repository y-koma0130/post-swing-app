import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { Notice } from '@/app/components/ui/Notice'
import { EmailCodeLoginForm } from '@/app/features/auth/components/EmailCodeLoginForm'
import { getActor } from '@/server/auth/getActor'
import { getTurnstileSiteKey } from '@/server/utils/turnstile'

export const metadata: Metadata = { title: 'コーチのログイン' }

/** デモ用のリンクで入れなかったとき（/api/auth/demo-login から ?demo=理由 で戻ってくる） */
const demoLoginError = (code: string): string => {
  if (code === 'expired') {
    return 'このデモは期限が過ぎました。続けて試したいときは、運営にご連絡ください。'
  }
  if (code === 'not_enabled') return 'デモはこの環境では使えません。'
  return 'このデモ用のリンクは使えません。新しいリンクを運営にお問い合わせください。'
}

type Props = {
  searchParams: Promise<{ demo?: string }>
}

const CoachLoginPage = async ({ searchParams }: Props) => {
  if (await getActor()) redirect('/coach')
  const { demo } = await searchParams
  const demoError = demo ? demoLoginError(demo) : null

  return (
    <main className="mx-auto max-w-sm">
      <Card className="space-y-6">
        <h1 className="text-title">コーチのログイン</h1>
        {demoError && (
          <Notice tone="warning">
            <p>{demoError}</p>
          </Notice>
        )}
        <EmailCodeLoginForm redirectTo="/coach" turnstileSiteKey={getTurnstileSiteKey()} />
      </Card>
    </main>
  )
}

export default CoachLoginPage
