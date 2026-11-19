# UI のルール

画面を作る・直すときは、このルールに従う。
迷ったら、**新しく見た目を作らず、すでにある部品と色の名前を使う**。
画面ごとに色・大きさ・角丸・ボタンの形を決めない。

- 色・文字の大きさの定義は `src/app/globals.css`（`@theme`）
- 共通の部品は `src/app/components/`（`ui/` に小さな部品）と `src/app/hooks/`
- このルールで足りない見た目が要るときは、画面の中で作らず、共通の部品か `globals.css` に足してから使う。足したら、このファイルも直す

## 色

色は `globals.css` に名前を付けたものだけを使う。`#xxxxxx` や `text-gray-500`・`bg-green-100` などの Tailwind の既定の色は使わない。
例外は次だけ。

- LINE の緑（`#06C755`）。LINE の案内（`Notice` の `line`）の中に閉じている
- CSS の変数が使えないところ：OG 画像（`opengraph-image.tsx`）、メール、動画に重ねる線の色（`annotation`）。ここでも、できるだけ下の表の値を使う

| 名前 | 値 | 使ってよいところ |
| --- | --- | --- |
| `mint` | #3fbf87 | ボタンの背景・線・枠・アイコン・フォーカスの枠。**文字には使わない** |
| `mint-soft` | #e6f8ef | ミントの薄い面（お知らせ・札・選んでいるもの） |
| `mint-text` | #18794e | **ミント色の文字**（小さな見出し・★・リンク・「ここから新着」など） |
| `ink` | #0b3d2c | 見出し・ボタンの文字・選んでいる切り替え（`bg-ink text-white`） |
| `body` | #3a3d3c | 本文 |
| `muted` | #626866 | 補足（説明・日付・件数・注記） |
| `subtle` | #9aa09d | 入力の見本（placeholder）と、使えない状態だけ。**読ませたい文字には使わない** |
| `surface` | #f6f7f6 | 画面の地（コーチ側）・押したときの背景・控えめな面 |
| `line` / `line-soft` | #e3e6e4 / #eef0ef | 区切り線・カードの縁・入力欄の枠 |
| `warning` / `warning-soft` | #7a5200 / #fff6e0 | 注意（不在・返信の遅れ・撮り直しのお願い） |
| `danger` / `danger-soft` | #c4302b / #fdeceb | エラー・取り消せない操作（削除・返金）・停止中 |

### 守ること

- **文字と背景のコントラストは 4.5:1 以上にする。** 白の上の `mint` は 2.3:1、`subtle` は 2.7:1 しかないので、文字に使わない
- **ミント色にしたい文字は `text-mint-text` にする。** `text-mint` は使わない
- **primary ボタンは `bg-mint text-ink`。** ミントの上に白い文字は置かない（2.3:1）
- 色の意味は4つに決めている。この意味の外で色を使わない
  - mint：うれしい・進んでいる・次にしてほしいこと
  - neutral：ふつう
  - warning：注意
  - danger：エラー・止まっている
- 状態を色だけで伝えない。文字（「承認待ち」「停止中」など）も必ず出す

## 文字の大きさ

4段だけにする。`text-xs`・`text-[10px]` などは使わない（スマホで読めない）。

| クラス | 大きさ | 使いみち |
| --- | --- | --- |
| `text-title` | 22px・太字 | ページの見出し（`PageHeader` が使う） |
| `text-heading` | 16px・太字 | まとまり（section）の見出し |
| （指定なし）/ `text-sm` | 16px / 14px | 本文 / 一覧やフォームの中の文 |
| `text-caption` | 13px | 補足（説明・日付・件数・札） |

## 部品

画面ごとに同じ役目のものを作らない。下の表にあるものは、必ずこれを使う。

| やりたいこと | 使うもの |
| --- | --- |
| ページの幅と余白 | `Page`（`layout`：form・list・wide・student） |
| ページの見出し・戻り先・右上の操作 | `PageHeader` |
| ボタン | `Button`・`ButtonLink`・`buttonClass`（variant：primary・secondary・ghost・danger。size：sm・md・lg） |
| 文字だけの目立たない操作（消す・閉じる・終える） | `TextButton`・`textButtonClass`（取り消せないものは `danger`） |
| 押せないカード | `Card` |
| **押すと別のページへ進むカード** | `CardLink`（右端に「›」が出る） |
| 画面の中のお知らせ・操作を促す枠 | `Notice`（tone：neutral・mint・warning・line。操作が要るときは `emphasis`） |
| 状態・残り枠などの小さな札 | `Badge`（tone：mint・neutral・warning・danger） |
| 中身がまだないとき | `EmptyState`（「ない」だけでなく、次にすることを書く） |
| 送る前の確認 | `useConfirmedSubmit`（フォーム）か `ConfirmDialog`。ブラウザの `confirm()` は使わない |
| Server Action の結果をフォームの下に出す | `FormMessage` |
| 開け閉めできる区分 | `details` に `summaryClass` と `DisclosureToggle` |
| 1つを選ぶ切り替え（道具・速度・タブ） | `segmentGroupClass` で囲んで `segmentClass` |
| 並んだ選択肢（動画の角度など） | `chipClass` |
| ×などの記号だけのボタン | `iconButtonClass`（`aria-label` を必ず付ける） |
| 入力欄・ラベル | `inputClass`・`labelTextClass` |
| 横（スマホは下）から出す作業スペース | `Drawer`（size：sheet・wide） |
| 読み込み中 | `Skeleton`・`PageSkeleton`（`loading.tsx`） |
| 404・エラーの画面 | `StatusScreen` |
| Stripe などほかのサイトへ移るフォーム | `useLeavingPage`（移るまでボタンを押せないままにする） |

### 形

- 角丸：カードとダイアログは `rounded-card`（20px）、入力欄は `rounded-xl`、ボタン・札・切り替えは `rounded-full`。これ以外の角丸を作らない
- カードは白地に `line-soft` の枠と `shadow-sm`（`Card` のまま）。カードの中にカードを入れない

## 押したときの反応

スマホでは hover が効かないので、押したことが必ず分かるようにする。

- **押せるものと押せないものを見分けられるようにする。** 枠のあるカードで押せるものは `CardLink` にする。押せないカードに hover の色を付けない
- **押した瞬間の見た目を付ける。** ボタンは `active:scale-[0.97]`（`buttonClass` に入っている）、カードは背景を `surface` にする（`CardLink` に入っている）
- **キーボードで選んだときはミントの枠を出す。** `focus-visible:ring-mint`。共通の部品に入っているので、自分で作ったときだけ気をつける
- **送っているあいだはボタンを押せなくして、文言を変える。** 「送る」→「送っています…」のように「〜しています…」にする。`pending` で `aria-busy` を付ける。薄くはしない（使えないように見えるため）
- 押せない状態（`disabled`）だけを薄くする（`opacity-40`）

## 文言

- 生徒向けは、やさしい言い方にする。専門用語や英語（「ステータス」「キャプチャ」など）は、言い換えられるなら言い換える
- 同じものは、どの画面でも同じ呼び方にする。呼び方を持っている定数があれば、それを使う。画面の中で書き直さない
  - スレッドの状態：`THREAD_STATUS_LABEL`
  - プランの種類：`PLAN_KIND_LABEL`
  - キー位置：`KEY_POSITION_LABEL`
  - 資格：`COACH_LICENSE_LABEL`
- 確認ダイアログは、何が起きるか・取り消せるかを書く。確定のボタンは動詞にする（「消す」「終える」「送る」）。「OK」「はい」にしない
- エラーは、何が起きたかと、次にどうすればいいかを書く

## アクセシビリティ

- 記号だけのボタンには `aria-label` を付ける
- 状態のお知らせは `role="status"`、エラーは `role="alert"`（`Notice` の `status` や `FormMessage` が付ける）
- 選択肢のまとまりは `fieldset` と `legend` にする（`role="group"` の div にしない）
- 画像には `alt` を付ける。飾りだけのものは `alt=""`

## LP（swing-post-lp）との関係

LP は別のリポジトリ。色の値とボタンの形はアプリと同じにする（`mint`・`mint-text`・`ink`・`muted`、ボタンは丸）。
こちらで色の値を変えたら、LP も同じ値に直す。
