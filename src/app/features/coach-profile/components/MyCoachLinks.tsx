import { CardLink } from '@/app/components/ui/CardLink'
import { CoachAvatar } from './CoachAvatar'

type Props = {
  coaches: Array<{ name: string; slug: string; avatarUrl: string | null }>
}

/** マイページの「あなたのコーチ」：申し込んだことのあるコーチの詳細ページへ */
export const MyCoachLinks = ({ coaches }: Props) => (
  <ul className="space-y-3">
    {coaches.map((coach) => (
      <li key={coach.slug}>
        <CardLink href={`/me/coaches/${coach.slug}`} className="flex items-center gap-3">
          <CoachAvatar name={coach.name} url={coach.avatarUrl} size={36} />
          <span className="truncate font-bold">{coach.name}</span>
        </CardLink>
      </li>
    ))}
  </ul>
)
