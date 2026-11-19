import { licenseLabels } from '@/app/utils/licenseText'
import type { CoachLicense } from '@/server/features/coach/domain/values/CoachLicense'

type Props = {
  licenses: ReadonlyArray<CoachLicense>
  licenseOther: string
}

/** コーチの資格を小さな札で並べる。なければ何も出さない */
export const CoachLicenses = ({ licenses, licenseOther }: Props) => {
  const labels = licenseLabels(licenses, licenseOther)
  if (labels.length === 0) return null
  return (
    <ul aria-label="資格" className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <li
          key={label}
          className="border-mint/40 bg-mint-soft text-ink text-caption rounded-full border px-2.5 py-0.5"
        >
          {label}
        </li>
      ))}
    </ul>
  )
}
