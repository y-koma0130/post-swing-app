'use client'

import { type FormEvent, useRef, useState } from 'react'
import { TurnstileWidget } from '@/app/components/TurnstileWidget'
import { Button } from '@/app/components/ui/Button'
import { authClient } from '@/app/utils/authClient'
import { CodeInput } from './CodeInput'

type Props = {
  /** ログイン後に開くページ */
  redirectTo: string
  /** ボット対策（Turnstile）のサイトキー */
  turnstileSiteKey: string
}

type Step = { kind: 'email' } | { kind: 'code'; email: string }

const inputClass =
  'w-full rounded-xl border border-line px-4 py-3 text-base outline-none focus:border-mint'

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
  const codeFormRef = useRef<HTMLFormElement>(null)

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
      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" pending={pending} disabled={!captchaToken} size="lg" className="w-full">
        {pending ? 'コードを送っています…' : 'ログインコードを送る'}
      </Button>
    </form>
  ) : (
    <form ref={codeFormRef} onSubmit={verifyCode} className="space-y-4">
      <p className="text-muted text-sm">{step.email} に届いた6桁のコードを入れてください。</p>
      <div className="space-y-2">
        <span className="text-sm font-bold">ログインコード</span>
        {/* 6桁そろったら、そのままログインする（押し忘れを防ぐ） */}
        <CodeInput
          name="code"
          length={6}
          disabled={pending}
          onComplete={() => codeFormRef.current?.requestSubmit()}
        />
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" pending={pending} size="lg" className="w-full">
        {pending ? '確認しています…' : 'ログイン'}
      </Button>
      <button
        type="button"
        onClick={() => setStep({ kind: 'email' })}
        className="text-muted w-full text-sm"
      >
        メールアドレスを入れ直す
      </button>
    </form>
  )
}
