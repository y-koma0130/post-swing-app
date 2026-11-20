import { z } from 'zod'
import { DEMO_RULES } from '../rules'

/**
 * デモのコーチの名前（コーチ候補の名前。管理画面で入れる）
 *
 * ドメインルール:
 * - 前後の空白は除く。空にはできない
 * - DEMO_RULES.nameMaxLength 文字まで
 */
export const demoCoachNameSchema = z
  .string()
  .trim()
  .min(1, '名前を入れてください')
  .max(DEMO_RULES.nameMaxLength, `名前は${DEMO_RULES.nameMaxLength}文字までです`)
  .brand<'DemoCoachName'>()

export type DemoCoachName = z.infer<typeof demoCoachNameSchema>
