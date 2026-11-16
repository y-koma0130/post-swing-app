import { redirect } from 'next/navigation'
import { refreshCurrentCoachPayout } from '@/server/features/coach/presentation/queries'

/** Stripe の口座設定から戻ってきたところ。状態を取り直して設定画面へ */
const PayoutReturnPage = async () => {
  await refreshCurrentCoachPayout()
  redirect('/coach/settings')
}

export default PayoutReturnPage
