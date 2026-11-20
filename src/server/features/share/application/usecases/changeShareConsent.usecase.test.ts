import { describe, expect, it, vi } from 'vitest'
import { SHARE_RULES } from '../../domain/rules'
import { NO_SHARE_CONSENT } from '../../domain/values/ShareConsent'
import { changeShareConsent } from './changeShareConsent.usecase'

type Deps = Parameters<typeof changeShareConsent>[1]

const now = new Date('2026-11-19T00:00:00Z')
const student = { userId: 'student-1', name: '' }
const all = { allowPublish: true, showFace: false, showAgeRange: true, showScore: true }

const setup = (latest: Awaited<ReturnType<Deps['findLatestAgeRange']>>, locked = false) => {
  const saveShareConsent = vi.fn<Deps['saveShareConsent']>(async () => undefined)
  const findLatestAgeRange = vi.fn<Deps['findLatestAgeRange']>(async () => latest)
  const isShareConsentLocked = vi.fn<Deps['isShareConsentLocked']>(async () => locked)
  return {
    deps: { findLatestAgeRange, isShareConsentLocked, saveShareConsent },
    saveShareConsent,
    findLatestAgeRange,
    isShareConsentLocked,
  }
}

describe('changeShareConsent', () => {
  it('申し込んだことのあるコーチへの許可を変えられ、文面の版と一緒に保存する', async () => {
    const { deps, saveShareConsent, findLatestAgeRange } = setup({ ageRange: '40s' })
    expect(
      await changeShareConsent({ actor: student, coachUserId: 'coach-1', choices: all, now }, deps)
    ).toEqual({ ok: true, value: all })
    expect(findLatestAgeRange).toHaveBeenCalledWith('student-1', 'coach-1')
    expect(saveShareConsent).toHaveBeenCalledWith({
      ...all,
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      textVersion: SHARE_RULES.consentTextVersion,
      updatedAt: now,
    })
  })

  it('申し込んだことのないコーチには not_found で、保存しない', async () => {
    const { deps, saveShareConsent } = setup(null)
    expect(
      await changeShareConsent({ actor: student, coachUserId: 'coach-2', choices: all, now }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(saveShareConsent).not.toHaveBeenCalled()
  })

  it('18歳未満は公開を許可できない。公開しない、には変えられる', async () => {
    const blocked = setup({ ageRange: 'under_18' })
    expect(
      await changeShareConsent(
        { actor: student, coachUserId: 'coach-1', choices: all, now },
        blocked.deps
      )
    ).toEqual({ ok: false, error: 'not_adult' })
    expect(blocked.saveShareConsent).not.toHaveBeenCalled()

    const off = setup({ ageRange: 'under_18' })
    expect(
      await changeShareConsent(
        { actor: student, coachUserId: 'coach-1', choices: NO_SHARE_CONSENT, now },
        off.deps
      )
    ).toEqual({ ok: true, value: NO_SHARE_CONSENT })
  })

  it('モニターで申し込んだコーチには、公開をやめられない。出す項目は変えられる', async () => {
    const locked = setup({ ageRange: '40s' }, true)
    expect(
      await changeShareConsent(
        { actor: student, coachUserId: 'coach-1', choices: NO_SHARE_CONSENT, now },
        locked.deps
      )
    ).toEqual({ ok: false, error: 'monitor_locked' })
    expect(locked.isShareConsentLocked).toHaveBeenCalledWith('student-1', 'coach-1')
    expect(locked.saveShareConsent).not.toHaveBeenCalled()

    const narrowed = setup({ ageRange: '40s' }, true)
    const choices = { ...all, showAgeRange: false }
    expect(
      await changeShareConsent(
        { actor: student, coachUserId: 'coach-1', choices, now },
        narrowed.deps
      )
    ).toEqual({ ok: true, value: choices })
    expect(narrowed.saveShareConsent).toHaveBeenCalled()
  })
})
