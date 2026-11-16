import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card } from '@/app/components/ui/Card'
import { EmailCodeLoginForm } from '@/app/features/auth/components/EmailCodeLoginForm'
import { getActor } from '@/server/auth/getActor'
import { getTurnstileSiteKey } from '@/server/utils/turnstile'

export const metadata: Metadata = { title: 'コーチのログイン' }

const CoachLoginPage = async () => {
  if (await getActor()) redirect('/coach')

  return (
    <main className="mx-auto max-w-sm">
      <Card className="space-y-6">
        <h1 className="text-xl font-bold">コーチのログイン</h1>
        <EmailCodeLoginForm redirectTo="/coach" turnstileSiteKey={getTurnstileSiteKey()} />
      </Card>
    </main>
  )
}

export default CoachLoginPage
