/**
 * プロフィール画像の URL。画像ごとにキーが変わるので、キーの末尾を URL に入れてキャッシュを分ける
 * （画像を変えると URL も変わり、ブラウザや SNS に古い画像が残らない）
 */
export const toAvatarUrl = (slug: string, r2Key: string | null): string | null => {
  if (!r2Key) return null
  const version = r2Key.split('/').pop()?.split('.')[0] ?? ''
  return `/api/coaches/${slug}/avatar?v=${version}`
}
