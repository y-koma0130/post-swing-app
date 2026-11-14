type Props = {
  params: Promise<{ coachSlug: string }>
}

/** 申し込み・動画送信。TODO: プラン選択 → ダミー決済 → 動画選択 → 悩み入力 → 完了 */
const ApplyPage = async ({ params }: Props) => {
  const { coachSlug } = await params
  return (
    <main className="px-6 py-10">
      <h1 className="text-xl font-bold">申し込み</h1>
      <p className="mt-2 text-sm text-gray-500">コーチ: {coachSlug}（実装予定）</p>
    </main>
  )
}

export default ApplyPage
