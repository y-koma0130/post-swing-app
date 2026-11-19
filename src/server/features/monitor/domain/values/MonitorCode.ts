import { z } from 'zod'
import { localDateSchema } from '@/server/utils/localDate'
import { MONITOR_RULES } from '../rules'

/** 生徒が入れるコード（英大文字と数字。大文字・小文字の違いは、読むときにそろえる） */
export const monitorCodeTextSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .length(MONITOR_RULES.codeLength)
      .regex(new RegExp(`^[${MONITOR_RULES.codeAlphabet}]+$`))
  )

/** コーチが決める、モニター募集の内容 */
export const monitorOfferSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, '呼び名を入れてください')
    .max(MONITOR_RULES.labelMaxLength, `呼び名は${MONITOR_RULES.labelMaxLength}文字までです`),
  /** モニター価格。0なら無料 */
  priceYen: z
    .number({ error: 'モニター価格を数字で入れてください' })
    .int('価格は整数です')
    .min(0, '価格は0円以上です'),
  maxUses: z
    .number({ error: '先着の人数を数字で入れてください' })
    .int('人数は整数です')
    .min(1, '人数は1人以上です')
    .max(MONITOR_RULES.maxUsesPerCode, `人数は${MONITOR_RULES.maxUsesPerCode}人までです`),
  /** この日まで使える。なければ期限なし */
  expiresOn: localDateSchema.nullable(),
})

export type MonitorOffer = z.infer<typeof monitorOfferSchema>

export type MonitorCode = MonitorOffer &
  Readonly<{
    id: string
    coachUserId: string
    code: string
    active: boolean
    createdAt: Date
  }>
