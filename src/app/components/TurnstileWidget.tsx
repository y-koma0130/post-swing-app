'use client'

import { useEffect, useRef } from 'react'

type TurnstileRenderOptions = {
  sitekey: string
  action: string
  language: string
  appearance: 'always' | 'execute' | 'interaction-only'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

type Turnstile = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoading: Promise<Turnstile> | null = null

/** Turnstile のスクリプトを1回だけ読み込む */
const loadTurnstile = (): Promise<Turnstile> => {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'))
    script.onerror = () => {
      scriptLoading = null
      reject(new Error('Turnstile を読み込めませんでした'))
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}

type Props = {
  siteKey: string
  /** 用途（サーバーで同じ値かを確かめる） */
  action: string
  /** トークンが出たら文字列、期限切れ・失敗なら null */
  onToken?: ((token: string | null) => void) | undefined
}

/**
 * Cloudflare Turnstile（ボット対策）の部品
 *
 * ほとんどの人には何も出ない（確認が要る人にだけチェックが出る）。フォームの中に置くと、
 * トークンが cf-turnstile-response という名前の隠し項目で一緒に送られる。
 * トークンは1回しか使えないので、送ったあとは key を変えて作り直す
 */
export const TurnstileWidget = ({ siteKey, action, onToken }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    const container = containerRef.current
    if (!container || !siteKey) return
    let widgetId: string | null = null
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          action,
          language: 'ja',
          // ふつうは何も出さず、確認が要る人にだけチェックを出す
          appearance: 'interaction-only',
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback': () => onTokenRef.current?.(null),
        })
      })
      .catch(() => onTokenRef.current?.(null))
    return () => {
      cancelled = true
      if (widgetId !== null) window.turnstile?.remove(widgetId)
    }
  }, [siteKey, action])

  return <div ref={containerRef} />
}
