import type { Metadata } from 'next'
import { EmailCodeLoginForm } from '@/app/features/auth/components/EmailCodeLoginForm'
import { LineLoginButton } from '@/app/features/auth/components/LineLoginButton'
import { getLoginOptions } from '@/server/auth/loginOptions'

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
    <main className="space-y-8 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="text-sm text-gray-600">
          添削が届いたら LINE でお知らせします。LINE のアカウントでログインしてください。
        </p>
      </div>
      {options.line ? (
        <LineLoginButton redirectTo={redirectTo} />
      ) : (
        <p className="text-sm text-gray-500">LINE ログインは準備中です。</p>
      )}
      {options.devEmail && (
        <section className="space-y-4 rounded-xl border border-dashed border-gray-300 p-4">
          <p className="text-xs font-bold text-gray-500">開発用：メールのコードでログイン</p>
          <EmailCodeLoginForm redirectTo={redirectTo} />
        </section>
      )}
    </main>
  )
}

export default StudentLoginPage
