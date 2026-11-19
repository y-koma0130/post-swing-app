import type { CoachLicense } from '@/server/features/coach/domain/values/CoachLicense'

/** 資格の呼び方（設定画面の選択肢と、受付ページの表示） */
export const COACH_LICENSE_LABEL = {
  pga_tournament: 'PGA トーナメントプロ',
  jlpga_tournament: 'JLPGA トーナメントプロ',
  pga_teaching_a: 'PGA ティーチングプロ A級',
  pga_teaching_b: 'PGA ティーチングプロ B級',
  jlpga_teaching: 'JLPGA ティーチングプロ',
  usgtf_teaching: 'USGTF ティーチングプロ',
  jipga: 'JIPGA ライセンス',
} as const satisfies Record<CoachLicense, string>

/** 選択肢の並び */
export const COACH_LICENSES = [
  'pga_tournament',
  'jlpga_tournament',
  'pga_teaching_a',
  'pga_teaching_b',
  'jlpga_teaching',
  'usgtf_teaching',
  'jipga',
] as const satisfies CoachLicense[]

/** 受付ページに出す資格の一覧（選んだもの → その他の順）。なければ空 */
export const licenseLabels = (
  licenses: ReadonlyArray<CoachLicense>,
  licenseOther: string
): string[] => [
  ...COACH_LICENSES.filter((license) => licenses.includes(license)).map(
    (license) => COACH_LICENSE_LABEL[license]
  ),
  ...(licenseOther.trim() === '' ? [] : [licenseOther.trim()]),
]
