import { describe, expect, it, vi } from 'vitest'
import { drillInputSchema } from '../../domain/values/Drill'
import { createDrill } from './createDrill.usecase'

type Deps = Parameters<typeof createDrill>[1]

const base = { title: 'タオルドリル', description: '脇にタオルを挟んで打つ' }
const uploadDrill = drillInputSchema.parse({
  ...base,
  video: { kind: 'upload', videoId: 'video-1' },
})
const youtubeDrill = drillInputSchema.parse({
  ...base,
  video: { kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ?t=90' },
})
const instagramDrill = drillInputSchema.parse({
  ...base,
  video: { kind: 'instagram', url: 'https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=x' },
})
const actor = { userId: 'coach-1', name: '' }

const setup = ({
  isCoach = true,
  videoUsable = true,
  youtube = 'playable',
}: {
  isCoach?: boolean
  videoUsable?: boolean
  youtube?: 'playable' | 'unavailable' | 'unknown'
} = {}) => {
  const saveDrill = vi.fn<Deps['saveDrill']>(async () => undefined)
  const isUnusedOwnDrillVideo = vi.fn<Deps['isUnusedOwnDrillVideo']>(async () => videoUsable)
  const checkYoutubeEmbed = vi.fn<Deps['checkYoutubeEmbed']>(async () => youtube)
  const deps: Deps = {
    isCoach: async () => isCoach,
    isUnusedOwnDrillVideo,
    checkYoutubeEmbed,
    saveDrill,
    generateId: () => 'drill-1',
  }
  return { deps, saveDrill, isUnusedOwnDrillVideo, checkYoutubeEmbed }
}

describe('createDrill', () => {
  it('コーチは、自分が上げた動画を付けてドリルを登録できる', async () => {
    const { deps, saveDrill, isUnusedOwnDrillVideo } = setup()
    expect(await createDrill({ actor, drill: uploadDrill }, deps)).toEqual({
      ok: true,
      value: { drillId: 'drill-1' },
    })
    expect(isUnusedOwnDrillVideo).toHaveBeenCalledWith('coach-1', 'video-1')
    expect(saveDrill).toHaveBeenCalledWith({
      ...base,
      id: 'drill-1',
      coachUserId: 'coach-1',
      video: { kind: 'upload', videoId: 'video-1' },
    })
  })

  it('コーチは、YouTube の動画を開始位置つきで登録できる', async () => {
    const { deps, saveDrill, checkYoutubeEmbed, isUnusedOwnDrillVideo } = setup()
    expect(await createDrill({ actor, drill: youtubeDrill }, deps)).toEqual({
      ok: true,
      value: { drillId: 'drill-1' },
    })
    expect(checkYoutubeEmbed).toHaveBeenCalledWith('dQw4w9WgXcQ')
    expect(isUnusedOwnDrillVideo).not.toHaveBeenCalled()
    expect(saveDrill).toHaveBeenCalledWith({
      ...base,
      id: 'drill-1',
      coachUserId: 'coach-1',
      video: { kind: 'youtube', youtubeId: 'dQw4w9WgXcQ', startSec: 90 },
    })
  })

  it('コーチは、Instagram の投稿を登録できる（確かめずにリンクとして持つ）', async () => {
    const { deps, saveDrill, checkYoutubeEmbed, isUnusedOwnDrillVideo } = setup()
    expect((await createDrill({ actor, drill: instagramDrill }, deps)).ok).toBe(true)
    expect(checkYoutubeEmbed).not.toHaveBeenCalled()
    expect(isUnusedOwnDrillVideo).not.toHaveBeenCalled()
    expect(saveDrill).toHaveBeenCalledWith({
      ...base,
      id: 'drill-1',
      coachUserId: 'coach-1',
      video: { kind: 'instagram', postKind: 'reel', shortcode: 'C1a2B3c4D5e' },
    })
  })

  it('コーチでなければ登録できない', async () => {
    const { deps, saveDrill } = setup({ isCoach: false })
    expect(
      await createDrill({ actor: { userId: 'student-1', name: '' }, drill: uploadDrill }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(saveDrill).not.toHaveBeenCalled()
  })

  it('ほかのコーチの動画や、もう使った動画は付けられない', async () => {
    const { deps, saveDrill } = setup({ videoUsable: false })
    expect(await createDrill({ actor, drill: uploadDrill }, deps)).toEqual({
      ok: false,
      error: 'invalid_video',
    })
    expect(saveDrill).not.toHaveBeenCalled()
  })

  it('非公開・削除済み・埋め込みできない YouTube の動画は付けられない', async () => {
    const { deps, saveDrill } = setup({ youtube: 'unavailable' })
    expect(await createDrill({ actor, drill: youtubeDrill }, deps)).toEqual({
      ok: false,
      error: 'youtube_unavailable',
    })
    expect(saveDrill).not.toHaveBeenCalled()
  })

  it('YouTube に問い合わせられないときは、登録を止めない', async () => {
    const { deps, saveDrill } = setup({ youtube: 'unknown' })
    expect((await createDrill({ actor, drill: youtubeDrill }, deps)).ok).toBe(true)
    expect(saveDrill).toHaveBeenCalled()
  })
})
