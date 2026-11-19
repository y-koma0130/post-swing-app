import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { MONITOR_RULES } from '../../domain/rules'
import {
  checkMonitorOffer,
  checkMonitorOfferChange,
  type MonitorOfferBlocker,
  type MonitorOfferChangeBlocker,
} from '../../domain/services/checkMonitorOffer.service'
import { generateMonitorCode } from '../../domain/services/generateMonitorCode.service'
import type { MonitorCode, MonitorOffer } from '../../domain/values/MonitorCode'

type Dependencies = Readonly<{
  /** コーチの1レッスンの通常価格（コーチでなければ null） */
  findSinglePrice: (coachUserId: string) => Promise<number | null>
  findMonitorCode: (codeId: string) => Promise<MonitorCode | null>
  /** このコードで申し込んだ数（断られた・期限切れ・消えた下書きは数えない） */
  countCodeUses: (codeId: string) => Promise<number>
  /** 受付中のコードの数（このコードを除く） */
  countActiveCodes: (coachUserId: string, exceptCodeId: string | null) => Promise<number>
  /** そのコードの文字列がもう使われているか（ほかのコーチのものも含む） */
  codeTaken: (code: string) => Promise<boolean>
  saveMonitorCode: (code: MonitorCode, updatedAt: Date) => Promise<void>
  randomBytes: () => Uint8Array
  generateId: () => string
}>

export type SaveMonitorCodeError =
  | 'not_found'
  | 'too_many_active'
  | 'code_unavailable'
  | MonitorOfferBlocker
  | MonitorOfferChangeBlocker

export type SaveMonitorCode = (
  params: Readonly<{
    actor: Actor
    /** 新しく作るなら null */
    codeId: string | null
    offer: MonitorOffer
    active: boolean
    /** コードの文字列を作り直す（古いコードは使えなくなる）。新しく作るときは必ず作る */
    regenerate: boolean
    now: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<{ codeId: string; code: string }, SaveMonitorCodeError>>

/** 使われていないコードを作る（たまたま重なったら作り直す） */
const freshCode = async (deps: Dependencies): Promise<string | null> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateMonitorCode(deps.randomBytes())
    if (!(await deps.codeTaken(code))) return code
  }
  return null
}

/**
 * コーチがモニター募集のプロモーションコードを作る・変える（本人のコーチだけ）
 *
 * - 作るときは、内容を checkMonitorOffer で確かめる（1レッスンより安く、0円か50円以上）
 * - 作ったあとは checkMonitorOfferChange：価格は変えられない。人数は申し込んだ数より減らせない
 * - 受付中にしておけるコードは MONITOR_RULES.maxActiveCodes まで
 * - コードの文字列は、作るときと、作り直すときだけ変わる
 */
export const saveMonitorCode: SaveMonitorCode = async (params, deps) => {
  const coachUserId = params.actor.userId
  const singlePriceYen = await deps.findSinglePrice(coachUserId)
  if (singlePriceYen === null) return err('not_found')
  const existing = params.codeId === null ? null : await deps.findMonitorCode(params.codeId)
  if (params.codeId !== null && (!existing || existing.coachUserId !== coachUserId)) {
    return err('not_found')
  }
  const offer = existing
    ? checkMonitorOfferChange({
        current: existing,
        next: params.offer,
        usedCount: await deps.countCodeUses(existing.id),
      })
    : checkMonitorOffer({ offer: params.offer, singlePriceYen })
  if (!offer.ok) return err(offer.error)
  if (
    params.active &&
    (await deps.countActiveCodes(coachUserId, existing?.id ?? null)) >= MONITOR_RULES.maxActiveCodes
  ) {
    return err('too_many_active')
  }
  const code = existing && !params.regenerate ? existing.code : await freshCode(deps)
  if (code === null) return err('code_unavailable')

  const saved: MonitorCode = {
    ...offer.value,
    id: existing?.id ?? deps.generateId(),
    coachUserId,
    code,
    active: params.active,
    createdAt: existing?.createdAt ?? params.now,
  }
  await deps.saveMonitorCode(saved, params.now)
  return ok({ codeId: saved.id, code: saved.code })
}
