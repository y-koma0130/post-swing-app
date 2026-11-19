'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { Button } from '@/app/components/ui/Button'
import { saveChartTagsAction } from '@/server/features/student-chart/presentation/actions'

type Props = {
  studentUserId: string
  tags: string[]
}

/** カルテのタグ（「スライス」「初心者」など）。足す・外すたびに保存する */
export const ChartTags = ({ studentUserId, tags: initial }: Props) => {
  const [tags, setTags] = useState(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (next: string[]) => {
    const previous = tags
    setTags(next)
    setError(null)
    startTransition(async () => {
      const result = await saveChartTagsAction(studentUserId, next)
      if (result.status === 'error') {
        setTags(previous)
        setError(result.message)
      }
    })
  }

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const tag = draft.trim()
    if (tag === '' || tags.includes(tag)) {
      setDraft('')
      return
    }
    save([...tags, tag])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-1.5" aria-label="タグ">
        {tags.map((tag) => (
          <li
            key={tag}
            className="bg-mint-soft text-ink text-caption inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5"
          >
            {tag}
            <button
              type="button"
              aria-label={`${tag}を外す`}
              disabled={pending}
              onClick={() => save(tags.filter((t) => t !== tag))}
              className="text-muted hover:text-ink rounded-full px-1"
            >
              ×
            </button>
          </li>
        ))}
        {tags.length === 0 && <li className="text-caption text-muted">タグはまだありません</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          maxLength={20}
          placeholder="例：スライス、初心者"
          aria-label="足すタグ"
          className="border-line focus:border-mint min-w-0 flex-1 rounded-full border bg-white px-3 py-1.5 text-sm outline-none"
        />
        <Button type="submit" variant="secondary" size="sm" pending={pending}>
          足す
        </Button>
      </form>
      {error && <p className="text-danger text-caption">{error}</p>}
    </div>
  )
}
