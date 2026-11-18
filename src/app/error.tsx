'use client'

import { StatusScreen } from '@/app/components/StatusScreen'
import { Button, ButtonLink } from '@/app/components/ui/Button'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

/** 画面の表示中に起きた想定外のエラー。もう一度読み込めば直ることが多い */
const ErrorPage = ({ error, reset }: Props) => (
  <StatusScreen
    title="うまく表示できませんでした"
    description={
      <>
        通信が不安定だったか、一時的な不具合の可能性があります。もう一度お試しください。
        {error.digest && (
          <span className="text-caption text-subtle mt-2 block">エラー番号：{error.digest}</span>
        )}
      </>
    }
    actions={
      <>
        <Button onClick={reset}>もう一度読み込む</Button>
        <ButtonLink href="/" variant="secondary">
          トップへ
        </ButtonLink>
      </>
    }
  />
)

export default ErrorPage
