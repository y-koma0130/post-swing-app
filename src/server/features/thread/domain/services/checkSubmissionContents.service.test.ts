import { describe, expect, it } from 'vitest'
import { checkSubmissionContents } from './checkSubmissionContents.service'

const draft = (id: string, angle: 'front' | 'back' | 'other' = 'front') => ({
  id,
  threadId: 't1',
  uploaderUserId: 'student',
  submissionId: null,
  chatMessageId: null,
  angle,
})
const base = {
  thread: { id: 't1', submissions: [] },
  actorUserId: 'student',
  videoIds: ['v1', 'v2'],
  drafts: [draft('v1', 'front'), draft('v2', 'back')],
  theme: ' トップで右ひざが流れる ',
  note: '  ドライバーです ',
  golfProfile: { ageRange: '40s', roundFrequency: 'monthly', averageScore: '98' },
}
const earlier = {
  id: 's0',
  submittedAt: new Date(),
  note: '',
  videos: [{ id: 'v0', angle: 'front' as const }],
  replied: true,
}

describe('checkSubmissionContents', () => {
  it('正面と後方を1回で出せる。最初はテーマを受け取る', () => {
    expect(checkSubmissionContents(base)).toEqual({
      ok: true,
      value: {
        videos: [
          { id: 'v1', angle: 'front' },
          { id: 'v2', angle: 'back' },
        ],
        note: 'ドライバーです',
        theme: 'トップで右ひざが流れる',
        golfProfile: { ageRange: '40s', roundFrequency: 'monthly', averageScore: 98 },
      },
    })
  })

  it('動画は1〜2本（同じ動画を2回選んでも1本）', () => {
    expect(checkSubmissionContents({ ...base, videoIds: [] })).toEqual({
      ok: false,
      error: 'no_videos',
    })
    expect(
      checkSubmissionContents({
        ...base,
        videoIds: ['v1', 'v2', 'v3'],
        drafts: [...base.drafts, draft('v3')],
      })
    ).toEqual({ ok: false, error: 'too_many_videos' })
    expect(checkSubmissionContents({ ...base, videoIds: ['v1', 'v1'] }).ok).toBe(true)
  })

  it('他人の動画・別のレッスンの動画・提出済みの動画・見つからない動画は使えない', () => {
    const invalid = { ok: false, error: 'invalid_video' }
    expect(
      checkSubmissionContents({
        ...base,
        drafts: [{ ...draft('v1'), uploaderUserId: 'x' }, draft('v2')],
      })
    ).toEqual(invalid)
    expect(
      checkSubmissionContents({
        ...base,
        drafts: [{ ...draft('v1'), threadId: 't2' }, draft('v2')],
      })
    ).toEqual(invalid)
    expect(
      checkSubmissionContents({
        ...base,
        drafts: [{ ...draft('v1'), submissionId: 's0' }, draft('v2')],
      })
    ).toEqual(invalid)
    expect(checkSubmissionContents({ ...base, drafts: [draft('v1')] })).toEqual(invalid)
    expect(
      checkSubmissionContents({
        ...base,
        drafts: [{ ...draft('v1'), chatMessageId: 'm1' }, draft('v2')],
      })
    ).toEqual(invalid)
  })

  it('最初の提出はテーマが要る。2回目以降はテーマを変えない', () => {
    expect(checkSubmissionContents({ ...base, theme: ' ' })).toEqual({
      ok: false,
      error: 'theme_required',
    })
    const second = checkSubmissionContents({
      ...base,
      thread: { id: 't1', submissions: [earlier] },
      theme: '',
    })
    expect(second.ok && second.value.theme).toBeNull()
  })

  it('メモは1000文字まで', () => {
    expect(checkSubmissionContents({ ...base, note: 'あ'.repeat(1001) })).toEqual({
      ok: false,
      error: 'note_too_long',
    })
  })

  it('ラウンドの回数と平均スコアは任意。書くなら平均スコアは50〜200の数字', () => {
    const blank = { ageRange: '40s', roundFrequency: '', averageScore: '' }
    const accepted = checkSubmissionContents({ ...base, golfProfile: blank })
    expect(accepted.ok && accepted.value.golfProfile).toEqual({
      ageRange: '40s',
      roundFrequency: null,
      averageScore: null,
    })
    expect(
      checkSubmissionContents({
        ...base,
        golfProfile: { ageRange: '40s', roundFrequency: '', averageScore: '20' },
      })
    ).toEqual({ ok: false, error: 'invalid_golf_profile' })
  })

  it('最初の提出では年代を必ず聞く', () => {
    expect(
      checkSubmissionContents({
        ...base,
        golfProfile: { ageRange: '', roundFrequency: 'monthly', averageScore: '98' },
      })
    ).toEqual({ ok: false, error: 'age_required' })
  })

  it('2回目以降の提出では、ラウンドの回数と平均スコアを見ない', () => {
    const result = checkSubmissionContents({
      ...base,
      thread: { id: 't1', submissions: [earlier] },
      golfProfile: { ageRange: '40s', roundFrequency: 'daily', averageScore: 'x' },
    })
    expect(result.ok && result.value.golfProfile).toBeNull()
  })
})
