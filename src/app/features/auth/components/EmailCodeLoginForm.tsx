'use client'

import { type FormEvent, useState } from 'react'
import { TurnstileWidget } from '@/app/components/TurnstileWidget'
import { Button } from '@/app/components/ui/Button'
import { authClient } from '@/app/utils/authClient'

type Props = {
  /** ログイン後に開くページ */
  redirectTo: string
  /** ボット対策（Turnstile）のサイトキー */
  turnstileSiteKey: string
}

type Step = { kind: 'email' } | { kind: 'code'; email: string }

const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-mint'

/**
 * メールに届く6桁のコードでログインする
 *
 * インスタや LINE のアプリ内ブラウザでも途切れないよう、リンクではなく同じ画面にコードを入れる
 */
export const EmailCodeLoginForm = ({ redirectTo, turnstileSiteKey }: Props) => {
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  // トークンは1回しか使えないので、送るたびに部品を作り直す
  const [captchaKey, setCaptchaKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!captchaToken) {
      setError('確認が終わるまで少し待ってから、もう一度お試しください。')
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' },
      { headers: { 'x-captcha-response': captchaToken } }
    )
    setPending(false)
    setCaptchaToken(null)
    setCaptchaKey((key) => key + 1)
    if (error) {
      setError(
        error.status === 429
          ? '送信が続いています。1分ほど待ってからもう一度お試しください。'
          : 'コードを送れませんでした。メールアドレスを確かめてください。'
      )
      return
    }
    setStep({ kind: 'code', email })
  }

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step.kind !== 'code') return
    const otp = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    setPending(true)
    setError(null)
    const { error } = await authClient.signIn.emailOtp({ email: step.email, otp })
    setPending(false)
    if (error) {
      setError('コードが違うか、期限が切れています。')
      return
    }
    // ヘッダーなどのレイアウトもログイン後の状態で描き直すため、ページごと読み込み直す
    window.location.assign(redirectTo)
  }

  return step.kind === 'email' ? (
    <form onSubmit={sendCode} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold">メールアドレス</span>
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <TurnstileWidget
        key={captchaKey}
        siteKey={turnstileSiteKey}
        action="login-code"
        onToken={setCaptchaToken}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || !captchaToken} className="w-full">
        ログインコードを送る
      </Button>
    </form>
  ) : (
    <form onSubmit={verifyCode} className="space-y-4">
      <p className="text-sm text-gray-600">{step.email} に届いた6桁のコードを入れてください。</p>
      <label className="block space-y-2">
        <span className="text-sm font-bold">ログインコード</span>
        <input
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          className={`${inputClass} tracking-[0.5em]`}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        ログイン
      </Button>
      <button
        type="button"
        onClick={() => setStep({ kind: 'email' })}
        className="w-full text-sm text-gray-500"
      >
        メールアドレスを入れ直す
      </button>
    </form>
  )
}
