// LINE通知の見た目（実際には送らない）。TODO: トーク画面風の装飾
export default function LineMockPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-[#8cabd9] px-4 py-10">
      <div className="max-w-[80%] rounded-2xl bg-white p-4 text-sm leading-relaxed">
        山田コーチから添削が届きました。
        <br />
        <span className="text-mint">▶ 添削を見る</span>
      </div>
    </main>
  )
}
