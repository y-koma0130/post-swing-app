'use client'

import { useFormStatus } from 'react-dom'
import { deleteDrillAction } from '@/server/features/drill/presentation/actions'

/** ドリルを消す（消しているあいだは押せなくして、文言を変える） */
export const DeleteDrillButton = ({ drillId }: { drillId: string }) => (
  <form action={deleteDrillAction}>
    <input type="hidden" name="drillId" value={drillId} />
    <SubmitLabel />
  </form>
)

const SubmitLabel = () => {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="text-muted hover:text-ink active:text-ink text-sm underline disabled:cursor-wait"
    >
      {pending ? '消しています…' : '消す'}
    </button>
  )
}
