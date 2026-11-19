import type { MonitorCodeBlocker } from '../../domain/services/checkMonitorCodeUse.service'

/** 生徒が使えるプロモーションコード（申し込みのモニター価格と、先着の人数） */
export type MonitorCodeUse = Readonly<{ codeId: string; priceYen: number; maxUses: number }>

/** プロモーションコードが使えない理由 */
export type ResolveMonitorCodeError = 'code_not_found' | MonitorCodeBlocker
