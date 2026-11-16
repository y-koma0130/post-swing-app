import Link from 'next/link'

type Props = {
  coaches: Array<{ name: string; slug: string }>
}

/** マイページの「コーチ」：申し込んだことのあるコーチの受付ページへ（もう一度申し込みやすくする） */
export const MyCoachLinks = ({ coaches }: Props) => (
  <ul className="space-y-2">
    {coaches.map((coach) => (
      <li key={coach.slug}>
        <Link
          href={`/c/${coach.slug}`}
          className="rounded-card flex items-center justify-between border border-gray-200 px-4 py-3 hover:bg-gray-50"
        >
          <span className="font-bold">{coach.name}</span>
          <span className="text-sm text-gray-600">受付ページへ →</span>
        </Link>
      </li>
    ))}
  </ul>
)
