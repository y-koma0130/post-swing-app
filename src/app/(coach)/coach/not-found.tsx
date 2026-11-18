import { StatusScreen } from '@/app/components/StatusScreen'
import { ButtonLink } from '@/app/components/ui/Button'

/** コーチの画面の中で見つからないとき（自分のでないスレッドなど） */
const CoachNotFound = () => (
  <StatusScreen
    placement="inline"
    code="404"
    title="ページが見つかりません"
    description="URL が間違っているか、見る権限のないページです。"
    actions={<ButtonLink href="/coach">ホームへ</ButtonLink>}
  />
)

export default CoachNotFound
