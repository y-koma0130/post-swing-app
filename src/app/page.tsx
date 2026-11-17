import { Logo } from '@/app/components/Logo'
import { SiteFooter } from '@/app/components/SiteFooter'
import { ButtonLink } from '@/app/components/ui/Button'
import { COACH_LP_URL } from '@/app/utils/externalLinks'

/** LP と同じ3つの柱 */
const FEATURES = [
  {
    label: 'INCOME',
    title: 'フォロワーを、生徒に',
    body: '添削するだけで、レッスン以外の収入に。全国のフォロワーに届き、価格も枠も自分で決められます。',
  },
  {
    label: 'EASY',
    title: '添削だけに集中できる',
    body: '受付・集金・通知はおまかせ。スロー・コマ送りで止めて、要所をワンタップでキャプチャ。',
  },
  {
    label: 'FREEDOM',
    title: '自分のペースで、自分の名前で',
    body: '受付枠で無理のない人数だけ。試合や旅行のときは不在期間を登録できます。',
  },
] as const

/** トップ。生徒はコーチの受付ページから来るので、ここはコーチ向けの紹介と入口（文言は LP にそろえる） */
const HomePage = () => (
  <div className="min-h-dvh bg-white">
    <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
      <Logo height={36} />
      <ButtonLink href="/coach" variant="ghost" size="sm">
        コーチのログイン
      </ButtonLink>
    </header>
    <main className="mx-auto max-w-4xl px-6">
      <section className="space-y-6 py-16 sm:py-24">
        <p className="text-caption text-mint font-bold tracking-wide">
          ゴルフコーチのための、オンライン添削サービス
        </p>
        <h1 className="text-3xl leading-snug font-bold sm:text-4xl">
          いいねの先に、
          <br />
          レッスンを。
        </h1>
        <p className="text-muted max-w-lg leading-relaxed">
          インスタのフォロワーに、スイング添削を月額で届けられます。プロフィールにリンクを貼って、届いた動画に線とひと言を添えて返すだけ。
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href={COACH_LP_URL} size="lg">
            コーチとして申し込む
          </ButtonLink>
          <ButtonLink href="/coach" variant="secondary" size="lg">
            コーチのログイン
          </ButtonLink>
        </div>
        <p className="text-caption text-muted">初期費用・月額 0円（手数料は売上の10%）</p>
      </section>
      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-surface rounded-card space-y-2 p-5">
            <p className="text-caption text-mint font-bold tracking-wide">{feature.label}</p>
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
