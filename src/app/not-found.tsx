import type { Metadata } from 'next'
import { StatusScreen } from '@/app/components/StatusScreen'
import { ButtonLink } from '@/app/components/ui/Button'

export const metadata: Metadata = { title: 'ページが見つかりません' }

/** 存在しない URL や、見る権限のないスレッド */
const NotFound = () => (
  <StatusScreen
    code="404"
    title="ページが見つかりません"
    description="URL が間違っているか、ページが削除された可能性があります。コーチの受付ページは、コーチのインスタのプロフィールなどから開いてください。"
    actions={
      <>
        <ButtonLink href="/me">マイページへ</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          トップへ
        </ButtonLink>
      </>
    }
  />
)

export default NotFound
