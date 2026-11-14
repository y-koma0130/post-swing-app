import type { Plan } from './values/Plan'
import { priceYenSchema } from './values/PriceYen'

export const COACH_RULES = {
  defaultMonthlyCapacity: 20,
} as const

/** 招待したときに作るプラン（計画書の初期値）。コーチがあとで変えられる */
export const DEFAULT_PLANS: readonly Plan[] = [
  {
    kind: 'trial',
    name: 'お試し',
    price: priceYenSchema.parse(550),
    description: '動画1本のミニ添削（チャット3通）',
    active: true,
  },
  {
    kind: 'single',
    name: '1スレッド',
    price: priceYenSchema.parse(4980),
    description: '動画3本まで・30日間',
    active: true,
  },
  {
    kind: 'monthly',
    name: '月額',
    price: priceYenSchema.parse(3980),
    description: '毎月1スレッド',
    active: true,
  },
]

/** 画面に並べる順（お試し → 1スレッド → 月額） */
export const PLAN_DISPLAY_ORDER = { trial: 0, single: 1, monthly: 2 } as const
