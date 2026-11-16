'use client'

import { useActionState, useState } from 'react'
import { Badge } from '@/app/components/ui/Badge'
import { Button } from '@/app/components/ui/Button'
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
    return <p className="text-muted text-sm">登録している不在期間はありません。</p>
  }

  return (
    <div className="space-y-3">
      <FormMessage state={state} />
      <ul className="divide-line-soft divide-y">
        {settings.absences.map((absence) => (
          <li key={absence.id} className="space-y-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {formatShortDate(absence.startDate)}〜{formatShortDate(absence.endDate)}
                  {absence.current && (
                    <Badge tone="warning" className="ml-2">
                      不在中
                    </Badge>
                  )}
                </p>
                <p className="text-muted text-sm">
                  {absence.note || '一言なし'}・
                  {absence.pauseNewSignups ? '新規の申し込みを止める' : '新規の申し込みは受ける'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingId(editingId === absence.id ? null : absence.id)}
                >
                  {editingId === absence.id ? '閉じる' : '編集'}
                </Button>
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm('この不在期間を消しますか？')) event.preventDefault()
                  }}
                >
                  <input type="hidden" name="absenceId" value={absence.id} />
                  <Button type="submit" variant="danger" size="sm" disabled={deleting}>
                    削除
                  </Button>
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
