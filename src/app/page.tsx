import { Logo } from '@/app/components/Logo'
import { ButtonLink } from '@/app/components/ui/Button'

/** トップ。生徒はコーチの受付ページから来るので、ここはコーチ向けの入口だけ */
const HomePage = () => (
  <main className="mx-auto max-w-md px-6 py-16">
    <Logo height={36} />
    <h1 className="mt-8 text-2xl leading-snug font-bold">
      フォロワーに、
      <br />
      スイング添削を届けよう。
    </h1>
    <p className="mt-4 text-sm leading-relaxed text-gray-600">
      動画を受け取り、コマ送りと線引きで添削し、集金まで。ゴルフのレッスンプロのためのサービスです。
    </p>
    <ButtonLink href="/coach" className="mt-10 w-full">
      コーチのログイン
    </ButtonLink>
  </main>
)

export default HomePage
