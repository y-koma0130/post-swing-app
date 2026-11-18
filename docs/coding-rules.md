# コーディングルール

`pnpm check`（型チェック＋lint）が通ることを、コミットの条件にする。

## 型

TypeScript の型の制約を最大限に使う。`tsconfig.json` で `strict` に加えて、次を有効にしている。

| 設定 | 効果 |
|---|---|
| `noUncheckedIndexedAccess` | `arr[0]` や `record[key]` の型が `T \| undefined` になる |
| `exactOptionalPropertyTypes` | `a?: string` に `undefined` を明示的に入れられない |
| `noPropertyAccessFromIndexSignature` | インデックスシグネチャには `obj['key']` でアクセスする |
| `noImplicitReturns` / `noFallthroughCasesInSwitch` | 戻り値・switch の漏れを防ぐ |
| `noUnusedLocals` / `noUnusedParameters` | 使っていない変数・引数を残さない |
| `verbatimModuleSyntax` | 型だけの import は `import type` にする |

### 禁止

| 禁止 | 代わりに | 検出 |
|---|---|---|
| `any` | `unknown` を受けて型ガードか zod で絞る | Biome `noExplicitAny` |
| `as` による型アサーション（`as const` は可） | 型ガード・zod の `parse`・`satisfies` | Biome プラグイン `biome-plugins/no-type-assertion.grit` |
| 非 null アサーション `x!` | 早期 return・`if (!x)` で絞る | Biome `noNonNullAssertion` |
| `@ts-ignore` | 型を直す。どうしても必要なら `@ts-expect-error` に理由を書く | Biome `noTsIgnore` |

### 推奨

- 外から来る値（フォーム、URL パラメータ、外部 API、DB の行）は、**境界で zod の `parse` を通してから**使う
- 取りうる値が決まっているものは `z.enum` か文字列リテラルのユニオンにする
- 対応表は `satisfies Record<Union, T>` で書いて、漏れを型で検出する
- ID などの取り違えたくない値は `.brand<'Name'>()` で区別する
- 状態ごとに持つ値が変わるものは判別可能なユニオン（`kind` で分ける）にする

## バックエンド（`src/server/`）

型と関数で書く、DDD 風の構成。クラスは使わない（エラーの定義だけは `Error` を継承してよい）。

### domain

- 値オブジェクト・エンティティは **zod スキーマ**で定義し、型は `z.infer` で取り出す
  ```ts
  export const coachSlugSchema = z.string().regex(/^[a-z0-9-]{3,30}$/).brand<'CoachSlug'>()
  export type CoachSlug = z.infer<typeof coachSlugSchema>
  ```
- ドメインのルールは、スキーマの JSDoc に「ドメインルール:」として書く
- 集約は、プレーンなデータを受けて `schema.parse` で組み立てるファクトリ関数を用意する
- ドメインサービスは `*.service.ts`。**関数の型を export し、同じ名前の const で実装する**
  ```ts
  export type CalcRemainingCapacity = (coach: Pick<Coach, 'monthlyCapacity'>, active: number) => number
  export const calcRemainingCapacity: CalcRemainingCapacity = (coach, active) => ...
  ```
- 「できるか・どうなるか」の判定はドメインサービスに置く。形は次のどれか
  - 可否の判定：`check*`。止める理由（`'closed'` など）か `null`、または受け付けた値を `Result` で返す（例：`checkPurchaseEligibility`、`checkReplySubmission`）
  - 状態の移り方・作り方：`nextStatusAfter`、`startThread`
  - 計算：`calc*`（例：`calcRemainingCapacity`、`calcMaintenanceDates`）
- 判定に要る事実（件数・有無など）は引数で受け取る。DB を引くのはユースケースの役目
- ルールの数値は `rules.ts` の定数にまとめる。SQL の条件に使う値（受付枠に数える状態など）も、ここの定数を infrastructure が使う
- ドメインサービスにはテストを書く（`*.service.test.ts`）
- domain は infrastructure を import しない

### application

- ユースケースは `*.usecase.ts`。`(params, dependencies)` を受け取る
- ユースケースに書くのは「権限の確認（誰が）→ 事実を読む → ドメインサービスで判定 → 書く・知らせる」の流れだけ。if 文でルールを直書きしない
- 依存する関数は `type Dependencies = Readonly<{ ... }>` で受け取り、**infrastructure の実装を直接 import しない**（型だけ import する）。テストでは差し替える
- 画面に返す形は `dto/*.dto.ts` の型で定義する。ブランド型は外して素の型にする
- ユースケースごとに `*.usecase.test.ts` を置き、権限（他人は `not_found`）とドメインのルールを Vitest で確かめる。依存は `vi.fn` で差し替える
- 戻り値は `Result`（`src/server/utils/result.ts`）。失敗は例外ではなく値で返す

### infrastructure

- `repositories/`：集約を保存・取得する。戻り値は `schema.parse` でドメインの型にして返す。状態などの値は受け取ったものを書き、自分で決めない
- `query-services/`：読み取り専用。ドメインを通さず DTO を直接返してよい
- `external-services/`：Stripe・LINE・R2 などの外部 API
- どれも関数の型を export し、同じ名前で実装する

### presentation

- `queries.ts`：Server Component から呼ぶ読み取り口
- `actions.ts`：Server Actions。入力は zod で検証し、ユースケースに依存を渡して呼ぶ
- 先頭に `import 'server-only'` を書き、クライアントに混ざらないようにする
- 外部サービスの細部（Webhook の署名の確認、SDK の呼び出し、`env` のシークレット）は infrastructure に置く。presentation は「入力の確認→ユースケース→結果の返却」だけにする

### feature の境界

各 feature の表（テーブル）に書き込むのは、その feature だけ。ほかの feature を使うときは、次のものだけを import する。

| 使ってよいもの | 例 |
|---|---|
| ほかの feature の `domain/`（値・純粋な関数） | `coach/domain/values/Plan`、`thread/domain/services/calcThreadPeriod.service` |
| ほかの feature の `application/dto/`（型） | `coach/application/dto/CoachProfile.dto` |
| ほかの feature の `public.ts`（組み立て済みの関数） | `notification/public` の `notify`、`thread/public` の `createThread` |

- `public.ts` は、その feature が外に出す関数だけを並べる。中身は infrastructure の関数をそのまま出すか、ユースケースを組み立てて出す
- domain・application からは `public.ts` も使わない（infrastructure と組み合わさっているため）。ほかの feature の処理が要るなら、ユースケースの `dependencies` で受け取り、presentation で `public.ts` の関数を渡す
- 自分の feature の中は相対パスで import する（`@/server/features/...` の絶対パスは、ほかの feature を指すときだけ）
- 読み取り専用の query-service は、画面のためにほかの feature の表を join してよい（書き込みはしない）
- Biome の `noRestrictedImports` で検出する

## フロントエンド（`src/app/`）

- `app/` 直下のルート（`page.tsx`・`layout.tsx`）はデータを取って部品に渡すだけにする
- 機能ごとの部品は `app/features/<feature>/{components,hooks,utils}/`
- 機能をまたぐものは `app/components/`・`app/hooks/`・`app/utils/`
- `features/` 同士の import はしない。共有したくなったら上の共通ディレクトリへ移す
- 複数の feature を組み合わせる、その画面だけの部品（例：動画プレイヤーに線引きを重ねる）は、ルートの `_components/` に置く。`_` で始まるフォルダは URL にならない
- データは server の `presentation` から取る。型は `dto` と `domain/values` から `import type` する
- ページ・レイアウトは Server Component のまま。動画・キャンバス・入力など、ブラウザが必要な部品だけ `'use client'` にする
- props の型は `type Props = { ... }` でコンポーネントの上に書く
- 書き込みは Server Actions（server の `presentation/actions.ts`）を呼ぶ。tRPC は使わない
- 例外：ファイルを送るもの（動画・カード画像）は Route Handler（`app/api/`）で受け、処理は server の presentation に置く。大きな本文をそのまま R2 へ流すため

## ネイティブアプリへの備え

将来コーチ向けの iPad アプリ（React Native を想定）を足すときに、作り直しを減らすためのルール。方針は [architecture.md](architecture.md#クライアントの方針web-とネイティブアプリ) を参照。

| ルール | 理由 | 検出 |
|---|---|---|
| server の `domain`・`application` は Next.js・React・Cloudflare（`cloudflare:*`）・DB・`server-only` に依存しない | Web の Server Actions とアプリ向けの HTTP API で、同じユースケースを使う | Biome `noRestrictedImports` |
| `presentation` は薄くする。入力の検証→ユースケースの呼び出し→結果の返却だけ | アプリ向けの API を足すときに、書き直すのが presentation だけで済む | レビュー |
| フロントの `utils/`（`app/utils/`・`app/features/*/utils/`）は React・Next.js・DOM（`window`・`document` など）に依存しない純粋な TS にする | 線の座標計算、キー位置の判定、カードのデータ変換などを React Native でそのまま使う | Biome `noRestrictedImports`・`noRestrictedGlobals` |
| DOM や `<video>`・`<canvas>` を触る処理は `hooks/`・`components/` に置き、計算部分は `utils/` に切り出す | 画面ごとに作り直す範囲を、描画と入力だけにする | レビュー |
| 座標・時間は解像度や画面サイズに依存しない値で持つ（座標は 0〜1、時間は秒） | Web とアプリ、スマホと iPad で同じデータを使う | 型（`normalizedPointSchema`） |
| 認証は Cookie だけを前提にしない。セッションの確認は presentation で行い、ユースケースには「誰が」を引数で渡す | アプリからはトークン（`Authorization` ヘッダー）で呼ぶため | レビュー |
| 画面に返す値は DTO の型で決め、Date など JSON にできない値は presentation の手前で扱いを決める | HTTP API で返すときに形を変えずに済む | 型 |

## 命名

| 対象 | 形 | 例 |
|---|---|---|
| React コンポーネントのファイル | PascalCase | `ThreadList.tsx` |
| 値オブジェクト・エンティティのファイル | PascalCase | `CoachSlug.ts` |
| 関数のファイル | camelCase＋役割の接尾辞 | `calcRemainingCapacity.service.ts`、`registerCoach.usecase.ts` |
| DTO | PascalCase＋`.dto.ts` | `ThreadDetail.dto.ts` |
| zod スキーマ | camelCase＋`Schema` | `threadSchema` |
| ディレクトリ | kebab-case | `coach-profile/`、`query-services/` |
| 定数 | UPPER_SNAKE_CASE | `THREAD_RULES` |

## 書き方

- フォーマットは Biome に任せる（シングルクォート、セミコロンなし、1行100文字）
- 関数はアロー関数で書く。ただし Next.js の `layout.tsx`・`page.tsx` の default export はどちらでもよい
- コメントは「なぜそうしたか」とドメインのルールを書く。コードを読めば分かることは書かない
- コメント・エラーメッセージは日本語

## コマンド

```bash
pnpm typecheck   # 型チェック
pnpm lint        # Biome（lint ＋ フォーマット確認）
pnpm lint:fix    # 自動修正
pnpm check       # 両方
```
