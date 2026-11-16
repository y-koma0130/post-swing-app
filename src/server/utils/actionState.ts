/**
 * Server Action の結果。フォームの下に出すメッセージに使う
 */
export type ActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; message: string }>
  | Readonly<{ status: 'error'; message: string }>

export const IDLE_ACTION_STATE: ActionState = { status: 'idle' }

export const actionSuccess = (message: string): ActionState => ({ status: 'success', message })

export const actionError = (message: string): ActionState => ({ status: 'error', message })
