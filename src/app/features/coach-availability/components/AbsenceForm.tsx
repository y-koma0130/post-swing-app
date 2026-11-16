'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { saveAbsenceAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { absencePreview } from '../utils/availabilityText'

type Absence = {
  id: string
  startDate: string
  endDate: string
  note: string
  pauseNewSignups: boolean
}

type Props = {
  coachName: string
  /** 編集するとき。追加なら null */
  absence: Absence | null
  today: string
  noteMaxLength: number
  onDone?: (() => void) | undefined
}

/** 不在期間の追加・編集。保存前に、生徒にどう見えるかを出す */
export const AbsenceForm = ({ coachName, absence, today, noteMaxLength, onDone }: Props) => {
  const [state, action, pending] = useActionState(saveAbsenceAction, IDLE_ACTION_STATE)
  const [startDate, setStartDate] = useState(absence?.startDate ?? '')
  const [endDate, setEndDate] = useState(absence?.endDate ?? '')

  return (
    <form
      action={async (formData) => {
        await action(formData)
        onDone?.()
      }}
      className="space-y-3"
    >
      {absence && <input type="hidden" name="absenceId" value={absence.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={labelTextClass}>開始日</span>
          <input
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.currentTarget.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelTextClass}>終了日（この日まで不在）</span>
          <input
            type="date"
            name="endDate"
            required
            min={startDate || today}
            value={endDate}
            onChange={(event) => setEndDate(event.currentTarget.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={labelTextClass}>生徒への一言（任意）</span>
        <input
          name="note"
          maxLength={noteMaxLength}
          defaultValue={absence?.note ?? ''}
          placeholder="試合のため"
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="pauseNewSignups"
          defaultChecked={absence?.pauseNewSignups ?? false}
          className="accent-mint"
        />
        不在中は新規の申し込みを止める
      </label>
      {startDate && endDate && startDate <= endDate && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          {absencePreview(coachName, { startDate, endDate })}
        </p>
      )}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {absence ? '保存する' : '不在期間を追加'}
      </Button>
    </form>
  )
}
