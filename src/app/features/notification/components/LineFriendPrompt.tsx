type Props = {
  addFriendUrl: string
}

/** 公式アカウントの友だち追加の案内（友だちでないと通知が届かない） */
export const LineFriendPrompt = ({ addFriendUrl }: Props) => (
  <div className="space-y-2 rounded-xl border border-[#06C755]/40 bg-[#06C755]/5 p-4">
    <p className="text-sm font-bold">添削が届いたら LINE でお知らせします</p>
    <p className="text-caption text-muted">
      お知らせを受け取るには、SwingPost の公式アカウントを友だちに追加してください。
    </p>
    <a
      href={addFriendUrl}
      className="inline-block rounded-full bg-[#06C755] px-4 py-2 text-sm font-bold text-white"
    >
      友だちに追加する
    </a>
  </div>
)
