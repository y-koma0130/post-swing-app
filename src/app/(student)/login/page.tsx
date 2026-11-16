import type { Metadata } from 'next'
import { Page } from '@/app/components/ui/Page'
import { EmailCodeLoginForm } from '@/app/features/auth/components/EmailCodeLoginForm'
import { LineLoginButton } from '@/app/features/auth/components/LineLoginButton'
import { getLoginOptions } from '@/server/auth/loginOptions'
import { getTurnstileSiteKey } from '@/server/utils/turnstile'

export const metadata: Metadata = { title: 'ログイン' }

type Props = {
  searchParams: Promise<{ next?: string }>
}

/**
 * 同じサイト内のパスだけを戻り先にする（外部サイトへ飛ばされないように）。
 * 指定がなければマイページへ（トップはコーチ向けの入口なので戻さない）
 */
const safeNext = (next: string | undefined): string =>
  next?.startsWith('/') && !next.startsWith('//') ? next : '/me'

const StudentLoginPage = async ({ searchParams }: Props) => {
  const { next } = await searchParams
  const redirectTo = safeNext(next)
  const options = getLoginOptions()

  return (
    <Page layout="student">
      <div className="space-y-2">
        <h1 className="text-title">ログイン</h1>
        <p className="text-muted text-sm">
          添削が届いたら LINE でお知らせします。LINE のアカウントでログインしてください。
        </p>
      </div>
      {options.line ? (
        <LineLoginButton redirectTo={redirectTo} />
      ) : (
        <p className="text-muted text-sm">LINE ログインは準備中です。</p>
      )}
      {options.devEmail && (
        <section className="border-line space-y-4 rounded-xl border border-dashed p-4">
          <p className="text-caption text-muted font-bold">開発用：メールのコードでログイン</p>
          <EmailCodeLoginForm redirectTo={redirectTo} turnstileSiteKey={getTurnstileSiteKey()} />
        </section>
      )}
    </Page>
  )
}

export default StudentLoginPage
