import { describe, expect, it, vi } from 'vitest'
import { createDrill } from './createDrill.usecase'

type Deps = Parameters<typeof createDrill>[1]

const drill = { title: 'タオルドリル', description: '脇にタオルを挟んで打つ', videoId: 'video-1' }

const setup = ({ isCoach = true, videoUsable = true } = {}) => {
  const saveDrill = vi.fn<Deps['saveDrill']>(async () => undefined)
  const isUnusedOwnDrillVideo = vi.fn<Deps['isUnusedOwnDrillVideo']>(async () => videoUsable)
  const deps: Deps = {
    isCoach: async () => isCoach,
    isUnusedOwnDrillVideo,
    saveDrill,
    generateId: () => 'drill-1',
  }
  return { deps, saveDrill, isUnusedOwnDrillVideo }
}

describe('createDrill', () => {
  it('コーチは、自分が上げた動画を付けてドリルを登録できる', async () => {
    const { deps, saveDrill, isUnusedOwnDrillVideo } = setup()
    expect(await createDrill({ actor: { userId: 'coach-1', name: '' }, drill }, deps)).toEqual({
      ok: true,
      value: { drillId: 'drill-1' },
    })
    expect(isUnusedOwnDrillVideo).toHaveBeenCalledWith('coach-1', 'video-1')
    expect(saveDrill).toHaveBeenCalledWith({ ...drill, id: 'drill-1', coachUserId: 'coach-1' })
  })

  it('コーチでなければ登録できない', async () => {
    const { deps, saveDrill } = setup({ isCoach: false })
    expect(await createDrill({ actor: { userId: 'student-1', name: '' }, drill }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(saveDrill).not.toHaveBeenCalled()
  })

  it('ほかのコーチの動画や、もう使った動画は付けられない', async () => {
    const { deps, saveDrill } = setup({ videoUsable: false })
    expect(await createDrill({ actor: { userId: 'coach-1', name: '' }, drill }, deps)).toEqual({
      ok: false,
      error: 'invalid_video',
    })
    expect(saveDrill).not.toHaveBeenCalled()
  })
})
