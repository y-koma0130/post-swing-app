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
  licenses: ['pga_teaching_a' as const],
  licenseOther: '',
  monthlyCapacity: 10,
}

const deps = (overrides: Partial<Parameters<typeof updateCoachProfile>[1]> = {}) => ({
  findCoachSlug: vi.fn(async () => coachSlugSchema.parse('old-slug')),
  isSlugTaken: vi.fn(async () => false),
  saveCoachProfile: vi.fn(async (): Promise<'saved' | 'slug_taken'> => 'saved'),
  generateSlug: () => coachSlugSchema.parse('random01'),
  findStripeAccountId: vi.fn(async (): Promise<string | null> => null),
  syncConnectProfile: vi.fn(async () => undefined),
  ...overrides,
})

describe('updateCoachProfile', () => {
  it('売上の受け取り口座があれば、Stripe の受付ページの URL と活動名を合わせる', async () => {
    const d = deps({ findStripeAccountId: vi.fn(async () => 'acct_1') })
    await updateCoachProfile({ actor, profile }, d)
    expect(d.syncConnectProfile).toHaveBeenCalledExactlyOnceWith({
      stripeAccountId: 'acct_1',
      slug: 'new-slug',
      displayName: '山田 太郎',
    })
  })

  it('口座がまだなければ、Stripe には何もしない', async () => {
    const d = deps()
    await updateCoachProfile({ actor, profile }, d)
    expect(d.syncConnectProfile).not.toHaveBeenCalled()
  })

  it('スラッグが取られていて保存できなければ、Stripe には何もしない', async () => {
    const d = deps({
      findStripeAccountId: vi.fn(async () => 'acct_1'),
      saveCoachProfile: vi.fn(async (): Promise<'saved' | 'slug_taken'> => 'slug_taken'),
    })
    await updateCoachProfile({ actor, profile }, d)
    expect(d.syncConnectProfile).not.toHaveBeenCalled()
  })

  it('自分のプロフィールを保存する', async () => {
    const d = deps()
    expect(await updateCoachProfile({ actor, profile }, d)).toEqual({
      ok: true,
      value: { slug: 'new-slug' },
    })
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

  it('スラッグを空にしたら、使われていないランダムな文字列にする', async () => {
    const taken = new Set(['random01'])
    let n = 0
    const d = deps({
      isSlugTaken: vi.fn(async (slug: string) => taken.has(slug)),
      generateSlug: () => coachSlugSchema.parse(n++ === 0 ? 'random01' : 'random02'),
    })
    expect(await updateCoachProfile({ actor, profile: { ...profile, slug: null } }, d)).toEqual({
      ok: true,
      value: { slug: 'random02' },
    })
  })

  it('ランダムな文字列が決められなければ保存しない', async () => {
    const d = deps({ isSlugTaken: vi.fn(async () => true) })
    expect(await updateCoachProfile({ actor, profile: { ...profile, slug: null } }, d)).toEqual({
      ok: false,
      error: 'slug_unavailable',
    })
    expect(d.saveCoachProfile).not.toHaveBeenCalled()
  })

  it('確かめたあとに同じスラッグを取られていたら slug_taken', async () => {
    const d = deps({
      saveCoachProfile: vi.fn(async (): Promise<'saved' | 'slug_taken'> => 'slug_taken'),
    })
    expect(await updateCoachProfile({ actor, profile }, d)).toEqual({
      ok: false,
      error: 'slug_taken',
    })
  })
})
