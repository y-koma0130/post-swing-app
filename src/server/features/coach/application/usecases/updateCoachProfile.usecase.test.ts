import { describe, expect, it, vi } from 'vitest'
import { coachSlugSchema } from '../../domain/values/CoachSlug'
import { updateCoachProfile } from './updateCoachProfile.usecase'

const actor = { userId: 'coach-1', name: '山田' }
const profile = {
  slug: coachSlugSchema.parse('new-slug'),
  name: '山田 太郎',
  title: 'ティーチングプロ',
  bio: '',
  instagram: '',
  monthlyCapacity: 10,
}

const deps = (overrides: Partial<Parameters<typeof updateCoachProfile>[1]> = {}) => ({
  findCoachSlug: vi.fn(async () => coachSlugSchema.parse('old-slug')),
  isSlugTaken: vi.fn(async () => false),
  saveCoachProfile: vi.fn(async () => undefined),
  ...overrides,
})

describe('updateCoachProfile', () => {
  it('自分のプロフィールを保存する', async () => {
    const d = deps()
    expect(await updateCoachProfile({ actor, profile }, d)).toEqual({ ok: true, value: undefined })
    expect(d.saveCoachProfile).toHaveBeenCalledWith('coach-1', profile)
  })

  it('コーチでない人は not_found', async () => {
    const d = deps({ findCoachSlug: vi.fn(async () => null) })
    expect(await updateCoachProfile({ actor, profile }, d)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(d.saveCoachProfile).not.toHaveBeenCalled()
  })

  it('ほかのコーチが使っているスラッグには変えられない', async () => {
    const d = deps({ isSlugTaken: vi.fn(async () => true) })
    expect(await updateCoachProfile({ actor, profile }, d)).toEqual({
      ok: false,
      error: 'slug_taken',
    })
  })

  it('スラッグを変えないときは、使用中かを調べない', async () => {
    const d = deps({ findCoachSlug: vi.fn(async () => profile.slug), isSlugTaken: vi.fn() })
    await updateCoachProfile({ actor, profile }, d)
    expect(d.isSlugTaken).not.toHaveBeenCalled()
  })
})
