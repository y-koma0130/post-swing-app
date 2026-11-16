import { Logo } from '@/app/components/Logo'
import { SiteFooter } from '@/app/components/SiteFooter'
import { ButtonLink } from '@/app/components/ui/Button'

const FEATURES = [
  {
    title: 'コマ送りと線で添削',
    body: '生徒の動画をコマ送りで止めて、線を引き、言葉を添えて返せます。',
  },
  {
    title: '受付と集金はおまかせ',
    body: '受付ページを作り、月の枠を決めるだけ。お支払いは Stripe で受け取れます。',
  },
  {
    title: '届いたら LINE でお知らせ',
    body: '添削が届くと生徒に LINE で通知。動画ごとのチャットで質問も受けられます。',
  },
] as const

/** トップ。生徒はコーチの受付ページから来るので、ここはコーチ向けの紹介と入口 */
const HomePage = () => (
  <div className="min-h-dvh bg-white">
    <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
      <Logo height={32} />
      <ButtonLink href="/coach" variant="ghost" size="sm">
        コーチのログイン
      </ButtonLink>
    </header>
    <main className="mx-auto max-w-4xl px-6">
      <section className="space-y-6 py-16 sm:py-24">
        <p className="text-caption text-mint font-bold tracking-wide">
          ゴルフのレッスンプロのために
        </p>
        <h1 className="text-3xl leading-snug font-bold sm:text-4xl">
          フォロワーに、
          <br />
          スイング添削を
          <br className="sm:hidden" />
          届けよう。
        </h1>
        <p className="text-muted max-w-lg leading-relaxed">
          動画の受け取りから、コマ送りと線引きの添削、集金まで。インスタのフォロワーに、オンラインのスイング添削を月額で届けられます。
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href="/coach" size="lg">
            コーチのログイン
          </ButtonLink>
        </div>
        <p className="text-caption text-muted">いまは招待制です。</p>
      </section>
      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-surface rounded-card space-y-2 p-5">
            <h2 className="text-heading">{feature.title}</h2>
            <p className="text-muted text-sm leading-relaxed">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
    <SiteFooter />
  </div>
)

export default HomePage
