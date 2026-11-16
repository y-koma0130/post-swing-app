import { StatusScreen } from '@/app/components/StatusScreen'
import { ButtonLink } from '@/app/components/ui/Button'

/** 生徒の画面の中で見つからないとき（受付ページの URL 違い、見られないスレッドなど） */
const StudentNotFound = () => (
  <StatusScreen
    placement="inline"
    code="404"
    title="ページが見つかりません"
    description="URL が間違っているか、ページが削除された可能性があります。コーチの受付ページは、コーチのインスタのプロフィールなどから開いてください。"
    actions={<ButtonLink href="/me">マイページへ</ButtonLink>}
  />
)

export default StudentNotFound
