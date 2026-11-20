'use client'

import { useId, useState } from 'react'
import { CONTACT_EMAIL } from '@/app/utils/externalLinks'
import type { ShareConsentChoices } from '@/server/features/share/domain/values/ShareConsent'

type Props = {
  coachName: string
  /** 18歳以上か（18歳未満・年代を選んでいなければ、公開を許可できない） */
  canPublish: boolean
  /** モニターの申し込み（公開の許可が条件） */
  required: boolean
  /**
   * モニターで申し込んだことのあるコーチ。公開はやめられない（出す項目は変えられる）。
   * やめたいときは運営にメールで問い合わせてもらう
   */
  locked?: boolean | undefined
  /** いまの許可（マイページで変えるとき）。初めてなら null */
  current: ShareConsentChoices | null
}

/** 公開してよいときの細かい項目。嫌なものだけ外してもらう（はじめは付けておく） */
const DETAILS = [
  { name: 'showFace', label: '顔を出してよい（外すと、顔をぼかします）' },
  { name: 'showAgeRange', label: '年代を出してよい（「40代」など）' },
  { name: 'showScore', label: '平均スコアを出してよい' },
] as const satisfies ReadonlyArray<{ name: keyof ShareConsentChoices; label: string }>

const UNLOCK_MESSAGE = `モニターの条件のため、紹介の許可は取り消せません。やめたいときは、運営（${CONTACT_EMAIL}）にメールでお問い合わせください。`

/**
 * 添削を SNS で紹介してよいかの許可（フォームの中に置く。checkbox の名前で送る）
 *
 * - 「紹介してもよい」だけは、本人が付ける（はじめは外しておく。モニターは必須）
 * - 公開してよいなら、細かい項目はすべて付いた状態から、嫌なものだけ外す
 * - 18歳未満は公開を許可できない
 * - モニターで申し込んだコーチには、公開をやめられない。外せないチェックに触れると（hover・タップ）、
 *   運営への問い合わせ先を出す
 */
export const ShareConsentFields = ({
  coachName,
  canPublish,
  required,
  locked = false,
  current,
}: Props) => {
  const [allow, setAllow] = useState(current?.allowPublish ?? false)
  const tooltipId = useId()
  const allowed = (allow || locked) && canPublish
  // モニターの申し込み・モニターで申し込んだコーチは、あとから公開をやめられない
  const binding = required || locked

  return (
    <fieldset className="border-line space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">SNS での紹介</legend>
      <p className="text-caption text-muted">
        許可すると、{coachName}
        さんが、あなたの添削（スイングの画像と線・コメント）をインスタなどの SNS
        で紹介することがあります。必ず紹介されるわけではなく、紹介するかは
        {coachName}さんが決めます。名前は出しません。
        {binding
          ? 'モニターの条件のため、あとから許可を取り消すことはできません。顔をぼかすか、年代・平均スコアを出すかは、あとからマイページで変えられます。'
          : 'あとからマイページでいつでも変えられます。'}
        （すでに投稿されたものは、コーチに削除を依頼してください）
      </p>
      {locked && canPublish ? (
        // 外せないチェック。disabled の checkbox は送られないので、許可は hidden で送る
        <div className="group relative">
          <input type="hidden" name="allowPublish" value="on" />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked
              disabled
              aria-describedby={tooltipId}
              className="accent-mint mt-1"
            />
            <span className="font-bold">
              紹介してもよい
              <button
                type="button"
                aria-label="紹介の許可を取り消したいとき"
                className="text-caption text-mint-text ml-2 font-normal underline underline-offset-2"
              >
                取り消したいとき
              </button>
            </span>
          </label>
          {/* hover・フォーカス（スマホではタップ）で出す。間をあけず、リンクまでカーソルを動かせるようにする */}
          <div className="invisible absolute top-full left-0 z-10 pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            <p
              id={tooltipId}
              role="tooltip"
              className="bg-ink text-caption w-72 max-w-[calc(100vw-4rem)] rounded-lg p-3 text-white shadow-lg"
            >
              {UNLOCK_MESSAGE}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('SNS での紹介の許可を取り消したい')}`}
                className="mt-1 block font-bold underline underline-offset-2"
              >
                メールで問い合わせる
              </a>
            </p>
          </div>
        </div>
      ) : (
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
            紹介してもよい
            {required && (
              <span className="text-danger ml-1 font-normal">（モニターの条件です）</span>
            )}
          </span>
        </label>
      )}
      {!canPublish && (
        <p className="text-caption text-muted">18歳未満の方は、紹介を許可できません。</p>
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
