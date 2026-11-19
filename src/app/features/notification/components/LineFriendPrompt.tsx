import { Notice } from '@/app/components/ui/Notice'

type Props = {
  addFriendUrl: string
}

/** 公式アカウントの友だち追加の案内（友だちでないと通知が届かない） */
export const LineFriendPrompt = ({ addFriendUrl }: Props) => (
  <Notice tone="line" title="添削が届いたら LINE でお知らせします">
    <p className="text-muted">
      お知らせを受け取るには、SwingPost の公式アカウントを友だちに追加してください。
    </p>
    <a
      href={addFriendUrl}
      className="inline-block rounded-full bg-[#06C755] px-4 py-2 text-sm font-bold text-white"
    >
      友だちに追加する
    </a>
  </Notice>
)
