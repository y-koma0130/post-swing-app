'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import type { ErrorOf } from '@/server/utils/result'
import { saveMonitorCode } from '../application/usecases/saveMonitorCode.usecase'
import { MONITOR_RULES } from '../domain/rules'
import { monitorOfferSchema } from '../domain/values/MonitorCode'
import { findSinglePrice } from '../infrastructure/query-services/monitorUsage'
import {
  codeTaken,
  countActiveCodes,
  findMonitorCode,
  saveMonitorCodeRow,
} from '../infrastructure/repositories/monitorCodeRepository'

const SAVE_ERROR = {
  not_found: 'コードが見つかりません',
  too_many_active: `受付中にしておけるコードは${MONITOR_RULES.maxActiveCodes}つまでです。ほかのコードを止めてください`,
  code_unavailable: 'コードを作れませんでした。もう一度お試しください',
  price_not_discounted: 'モニター価格は、1レッスンの価格より安くしてください',
  price_below_minimum: `有料にするなら${MONITOR_RULES.minPaidPriceYen}円以上にしてください（無料は0円）`,
} as const satisfies Record<ErrorOf<typeof saveMonitorCode>, string>

/**
 * コーチがモニター募集のプロモーションコードを作る・変える・作り直す・止める。
 * フォームの intent：save（作る・変える）・regenerate（コードを作り直す）・toggle（受付中と停止を切り替える）
 */
export const saveMonitorCodeAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const codeId = formString(formData, 'codeId') || null
  const intent = formString(formData, 'intent')
  const expiresOn = formString(formData, 'expiresOn')
  const offer = monitorOfferSchema.safeParse({
    label: formString(formData, 'label'),
    priceYen: Number(formString(formData, 'priceYen')),
    maxUses: Number(formString(formData, 'maxUses')),
    expiresOn: expiresOn === '' ? null : expiresOn,
  })
  if (!offer.success) {
    return actionError(offer.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const active =
    intent === 'toggle' ? !formChecked(formData, 'active') : formChecked(formData, 'active')
  const result = await saveMonitorCode(
    {
      actor,
      codeId,
      offer: offer.data,
      active: codeId === null ? true : active,
      regenerate: intent === 'regenerate',
      now: new Date(),
    },
    {
      findSinglePrice,
      findMonitorCode,
      countActiveCodes,
      codeTaken,
      saveMonitorCode: saveMonitorCodeRow,
      randomBytes: () => crypto.getRandomValues(new Uint8Array(MONITOR_RULES.codeLength)),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) return actionError(SAVE_ERROR[result.error])
  revalidatePath('/coach/settings')
  const message =
    codeId === null
      ? `プロモーションコード ${result.value.code} を作りました`
      : intent === 'regenerate'
        ? `コードを ${result.value.code} に作り直しました。前のコードは使えません`
        : intent === 'toggle'
          ? active
            ? '募集を再開しました'
            : '募集を止めました'
          : '保存しました'
  return actionSuccess(message)
}
