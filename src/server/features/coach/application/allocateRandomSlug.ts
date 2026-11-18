import type { CoachSlug } from '../domain/values/CoachSlug'

/** 重なりを避けて試す回数（8文字なので、まず1回で決まる） */
const MAX_TRIES = 5

/** まだ使われていないランダムなスラッグ。決められなければ null */
export const allocateRandomSlug = async (deps: {
  generateSlug: () => CoachSlug
  isSlugTaken: (slug: CoachSlug) => Promise<boolean>
}): Promise<CoachSlug | null> => {
  for (let i = 0; i < MAX_TRIES; i++) {
    const slug = deps.generateSlug()
    if (!(await deps.isSlugTaken(slug))) return slug
  }
  return null
}
