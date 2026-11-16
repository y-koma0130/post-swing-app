'use client'

import { CoachAvatar } from '@/app/features/coach-profile/components/CoachAvatar'
import { useAvatarUpload } from '../hooks/useAvatarUpload'

type Props = {
  name: string
  avatarUrl: string | null
}

/** プロフィール画像。選んだ画像の真ん中を正方形に切り抜いて使う */
export const AvatarUploader = ({ name, avatarUrl }: Props) => {
  const { upload, remove, pending, error } = useAvatarUpload()

  return (
    <div className="flex items-center gap-4">
      <CoachAvatar name={name} url={avatarUrl} size={72} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-sm">
            {pending ? '保存中…' : avatarUrl ? '画像を変える' : '画像を選ぶ'}
            <input
              type="file"
              accept="image/*"
              disabled={pending}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file) void upload(file)
              }}
            />
          </label>
          {avatarUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void remove()}
              className="rounded-full px-3 py-2 text-sm text-gray-500"
            >
              外す
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          受付ページと、SNS に貼ったときのカードに出ます。真ん中が正方形に切り抜かれます。
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
