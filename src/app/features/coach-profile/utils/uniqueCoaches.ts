/** 申し込みの一覧から、コーチを重ねずに取り出す（新しい申し込みの順を保つ） */
export const uniqueCoaches = (
  purchases: ReadonlyArray<{ coachName: string; coachSlug: string; coachAvatarUrl: string | null }>
): Array<{ name: string; slug: string; avatarUrl: string | null }> => {
  const seen = new Set<string>()
  return purchases.flatMap((p) => {
    if (seen.has(p.coachSlug)) return []
    seen.add(p.coachSlug)
    return [{ name: p.coachName, slug: p.coachSlug, avatarUrl: p.coachAvatarUrl }]
  })
}
