import type { ActionState } from '@/server/utils/actionState'

type Props = {
  state: ActionState
}

/** Server Action の結果をフォームの下に出す */
export const FormMessage = ({ state }: Props) => {
  if (state.status === 'idle') return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`text-sm ${state.status === 'error' ? 'text-danger' : 'text-ink'}`}
    >
      {state.message}
    </p>
  )
}
