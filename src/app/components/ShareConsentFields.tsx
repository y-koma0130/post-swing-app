'use client'

import { useState } from 'react'
import type { ShareConsentChoices } from '@/server/features/share/domain/values/ShareConsent'

type Props = {
  coachName: string
  /** 18歳以上か（18歳未満・年代を選んでいなければ、公開を許可できない） */
  canPublish: boolean
  /** モニターの申し込み（公開の許可が条件） */
  required: boolean
  /** いまの許可（マイページで変えるとき）。初めてなら null */
  current: ShareConsentChoices | null
}

/** 公開してよいときの細かい項目。嫌なものだけ外してもらう（はじめは付けておく） */
const DETAILS = [
  { name: 'showFace', label: '顔を出してよい（外すと、顔をぼかします）' },
  { name: 'showAgeRange', label: '年代を出してよい（「40代」など）' },
  { name: 'showScore', label: '平均スコアを出してよい' },
] as const satisfies ReadonlyArray<{ name: keyof ShareConsentChoices; label: string }>

/**
 * 添削の公開の許可（フォームの中に置く。checkbox の名前で送る）
 *
 * - 「公開してよい」だけは、本人が付ける（はじめは外しておく。モニターは必須）
 * - 公開してよいなら、細かい項目はすべて付いた状態から、嫌なものだけ外す
 * - 18歳未満は公開を許可できない
 */
export const ShareConsentFields = ({ coachName, canPublish, required, current }: Props) => {
  const [allow, setAllow] = useState(current?.allowPublish ?? false)
  const allowed = allow && canPublish

  return (
    <fieldset className="border-line space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">添削の公開</legend>
      <p className="text-caption text-muted">
        {coachName}
        さんが、あなたの添削（スイングの画像と線・コメント）をインスタなどで紹介することがあります。名前は出しません。あとからマイページでいつでも変えられます（すでに投稿されたものは、コーチに削除を依頼してください）。
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="allowPublish"
          checked={allowed}
          disabled={!canPublish}
          required={required && canPublish}
          onChange={(event) => setAllow(event.currentTarget.checked)}
          className="accent-mint mt-1"
        />
        <span className="font-bold">
          公開してよい
          {required && <span className="text-danger ml-1 font-normal">（モニターの条件です）</span>}
        </span>
      </label>
      {!canPublish && (
        <p className="text-caption text-muted">18歳未満の方は、公開を許可できません。</p>
      )}
      {allowed && (
        <div className="space-y-2 pl-6">
          {DETAILS.map((item) => (
            <label key={item.name} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name={item.name}
                defaultChecked={current?.allowPublish ? current[item.name] : true}
                className="accent-mint mt-1"
              />
              {item.label}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
