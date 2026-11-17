const STEPS = [
  {
    title: '悩みと動画を送って申し込む',
    body: 'プランを選び、直したいところとスマホで撮ったスイング動画を送ります（正面と後方など、1回に複数まとめて送れます）。LINE かメールでログインします。',
  },
  {
    title: 'コーチが内容を見て受け付ける',
    body: 'カードは登録だけで、請求はコーチが受け付けたときです。48時間以内にお返事します。',
  },
  {
    title: '添削が届く',
    body: 'コーチが動画に線を引き、言葉で解説します。届いたら LINE でお知らせします。',
  },
  { title: 'チャットで質問する', body: 'わからないところは、コーチにチャットで聞けます。' },
] as const

/** 受付ページの「添削の流れ」。はじめての人が申し込む前に流れをつかめるように */
export const HowItWorks = () => (
  <section className="space-y-4">
    <h2 className="text-heading">添削の流れ</h2>
    <ol className="space-y-4">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span className="bg-mint-soft text-ink text-caption flex size-7 shrink-0 items-center justify-center rounded-full font-bold">
            {index + 1}
          </span>
          <div className="space-y-0.5 pt-0.5">
            <p className="text-sm font-bold">{step.title}</p>
            <p className="text-muted text-sm">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
)
