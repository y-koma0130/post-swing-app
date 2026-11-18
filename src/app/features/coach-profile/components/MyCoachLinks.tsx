import Link from 'next/link'
import { CoachAvatar } from './CoachAvatar'

type Props = {
  coaches: Array<{ name: string; slug: string; avatarUrl: string | null }>
}

/** マイページの「コーチ」：申し込んだことのあるコーチの詳細ページへ */
export const MyCoachLinks = ({ coaches }: Props) => (
  <ul className="space-y-2">
    {coaches.map((coach) => (
      <li key={coach.slug}>
        <Link
          href={`/me/coaches/${coach.slug}`}
          className="rounded-card border-line hover:bg-surface flex items-center justify-between border px-4 py-3"
        >
          <span className="flex items-center gap-3">
            <CoachAvatar name={coach.name} url={coach.avatarUrl} size={36} />
            <span className="font-bold">{coach.name}</span>
          </span>
          <span className="text-muted text-sm">詳しく見る →</span>
        </Link>
      </li>
    ))}
  </ul>
)
