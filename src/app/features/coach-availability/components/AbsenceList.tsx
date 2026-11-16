'use client'

import { useActionState, useState } from 'react'
import { FormMessage } from '@/app/components/ui/FormMessage'
import type { AvailabilitySettingsDto } from '@/server/features/coach/application/dto/AvailabilitySettings.dto'
import { deleteAbsenceAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { formatShortDate } from '../utils/availabilityText'
import { AbsenceForm } from './AbsenceForm'

type Props = {
  coachName: string
  settings: AvailabilitySettingsDto
}

/** 今とこれからの不在期間。編集・削除ができる */
export const AbsenceList = ({ coachName, settings }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [state, deleteAction, deleting] = useActionState(deleteAbsenceAction, IDLE_ACTION_STATE)

  if (settings.absences.length === 0) {
    return <p className="text-sm text-gray-500">登録している不在期間はありません。</p>
  }

  return (
    <div className="space-y-3">
      <FormMessage state={state} />
      <ul className="divide-y divide-gray-100">
        {settings.absences.map((absence) => (
          <li key={absence.id} className="space-y-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {formatShortDate(absence.startDate)}〜{formatShortDate(absence.endDate)}
                  {absence.current && (
                    <span className="bg-mint-soft text-ink ml-2 rounded-full px-2 py-0.5 text-xs">
                      不在中
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {absence.note || '一言なし'}・
                  {absence.pauseNewSignups ? '新規の申し込みを止める' : '新規の申し込みは受ける'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === absence.id ? null : absence.id)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs"
                >
                  {editingId === absence.id ? '閉じる' : '編集'}
                </button>
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm('この不在期間を消しますか？')) event.preventDefault()
                  }}
                >
                  <input type="hidden" name="absenceId" value={absence.id} />
                  <button
                    type="submit"
                    disabled={deleting}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700"
                  >
                    削除
                  </button>
                </form>
              </div>
            </div>
            {editingId === absence.id && (
              <AbsenceForm
                coachName={coachName}
                absence={absence}
                today={settings.today}
                noteMaxLength={settings.noteMaxLength}
                onDone={() => setEditingId(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
