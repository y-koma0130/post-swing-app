import type { Plan, PlanKind } from './values/Plan'
import { priceYenSchema } from './values/PriceYen'

export const COACH_RULES = {
  defaultMonthlyCapacity: 20,
} as const

/**
 * 返信の約束と不在のルール（暫定。あとで見直す前提で、数値はここにまとめる）
 */
export const AVAILABILITY_RULES = {
  /** 動画の添削を返すまでの約束（時間） */
  replyTargetHours: 48,
  /** 返信遅れフラグは、立ててからこの日数で自動で外れる */
  delayFlagDays: 7,
  /** これから始まる不在を、受付ページで何日前から知らせるか */
  upcomingNoticeDays: 7,
  /** 不在のときに生徒へ見せる一言の長さ */
  absenceNoteMaxLength: 40,
} as const

/** 招待したときに作るプラン（計画書の初期値）。コーチがあとで変えられる */
export const DEFAULT_PLANS: readonly Plan[] = [
  {
    kind: 'trial',
    name: 'お試し',
    price: priceYenSchema.parse(550),
    description: '提出1回・チャット10通までのミニ添削',
    active: true,
  },
  {
    kind: 'single',
    name: '1スレッド',
    price: priceYenSchema.parse(4980),
    description: '提出3回・チャット30通まで・30日間',
    active: true,
  },
  {
    kind: 'monthly',
    name: '月額',
    price: priceYenSchema.parse(3980),
    description: '毎月1スレッド（提出3回・チャット30通まで）',
    active: true,
  },
]

/**
 * プランの最低価格（円）。コーチはこれ以上で自由に決める（暫定）
 * 月額は毎月1スレッドなので、1スレッドと同じにする
 */
export const PLAN_MIN_PRICE_YEN = {
  trial: 550,
  single: 3980,
  monthly: 3980,
} as const satisfies Record<PlanKind, number>

/** 画面に並べる順（お試し → 1スレッド → 月額） */
export const PLAN_DISPLAY_ORDER = { trial: 0, single: 1, monthly: 2 } as const

/** プロフィール画像のルール（ブラウザで正方形に切り抜き、縮めてから送る） */
export const AVATAR_RULES = {
  /** 一辺の大きさ（px） */
  size: 512,
  /** 送られてくる大きさの上限（512px の JPEG なら 100KB 前後） */
  maxBytes: 1024 * 1024,
  /** OG 画像の描画（satori）でも読める形式に限る */
  allowedContentTypes: ['image/jpeg', 'image/png'],
} as const
