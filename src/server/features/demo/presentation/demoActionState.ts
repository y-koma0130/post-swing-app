import type { ActionState } from '@/server/utils/actionState'

/** デモの管理の結果。作った・作り直したときは、デモ用のリンクも返す */
export type DemoActionState =
  | ActionState
  | Readonly<{ status: 'link'; message: string; url: string }>
