import { z } from 'zod'

/**
 * コーチの資格（ライセンス）。選択肢から複数選べ、選択肢にないものは「その他」に自由に書く
 *
 * ドメインルール:
 * - 選択肢は同じものを2回選べない
 * - その他は50文字まで（空なら書いていない）
 * - 選択肢はあとで増やせるよう、コードで持つ（呼び方は画面の側）
 */
export const coachLicenseSchema = z.enum([
  'pga_tournament',
  'jlpga_tournament',
  'pga_teaching_a',
  'pga_teaching_b',
  'jlpga_teaching',
  'usgtf_teaching',
  'jipga',
])

export type CoachLicense = z.infer<typeof coachLicenseSchema>

/** 保存してある値から、いまの選択肢にあるものだけを取り出す（選択肢を減らしても、読み込みで失敗しないように） */
export const knownLicenses = (values: ReadonlyArray<string>): CoachLicense[] =>
  values.flatMap((value) => {
    const parsed = coachLicenseSchema.safeParse(value)
    return parsed.success ? [parsed.data] : []
  })

export const coachLicensesSchema = z
  .array(coachLicenseSchema)
  .refine((list) => new Set(list).size === list.length, '同じ資格は1回だけ選べます')

export const licenseOtherSchema = z.string().trim().max(50, 'その他の資格は50文字までです')
