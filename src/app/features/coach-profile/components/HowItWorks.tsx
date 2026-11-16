const STEPS = [
  {
    title: 'プランを選んで申し込む',
    body: 'お支払いは Stripe で。LINE かメールでログインします。',
  },
  { title: 'スイング動画を送る', body: 'スマホで撮った動画をそのまま送れます。' },
  {
    title: '添削が届く',
    body: 'コーチが動画に線を引き、言葉で解説します。届いたら LINE でお知らせします。',
  },
  { title: 'チャットで質問する', body: 'わからないところは、動画ごとのチャットで聞けます。' },
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
