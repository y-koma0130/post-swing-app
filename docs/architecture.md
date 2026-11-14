# インフラ構成とディレクトリ構成

## 方針

- **Cloudflare に寄せる。** Next.js（App Router）を vinext で動かし Cloudflare Workers に置く。動画は R2（転送料なし）。
- **アプリのコードは素の Next.js の書き方に留める。** vinext 固有の API に依存しないので、正式リリース前に OpenNext（`@opennextjs/cloudflare`）へ乗り換える判断もできる。
- **重い処理はブラウザで。** 骨格推定・コマ切り出し・動画の圧縮はクライアントで行い、サーバー費用を増やさない。

## クライアントの方針（Web とネイティブアプリ）

**生徒向けは Web で続ける。うまくいったら、コーチ向けの iPad アプリを追加する。**（2026-11-14 決定）

### Web で始める理由

- **生徒はインスタのリンクから来る。** インストールなしで申し込みと動画送信まで進めるのが、集客の前提
- **決済**：アプリで添削を売ると、Apple のアプリ内課金（手数料15〜30%）を求められる可能性が高く、手数料10%のモデルと合わない（計画書 12章）。日本ではスマホ新法で外部決済に誘導できるようになったが、Apple は外部決済にも手数料をかける仕組みを残しているので、詳細は要確認
- **検証の速さ**：審査なしで何度も直せる

### アプリを作るならコーチ側から

アプリの利点（iPad と Apple Pencil での線引き、正確なコマ送り、端末上での骨格推定）が効くのは、コーチの添削作業。生徒は「撮る→送る→見る」だけなので Web で足りる。コーチ向けアプリは生徒への販売がないので、アプリ内課金の問題も出ない。

### アプリに着手する目安

次のどれかに当てはまったら検討する。

- MOC・段階1で、iPhone や iPad の Safari ではコマ送りや線引きが実用にならないと分かった
- コーチの添削1件あたりの時間が、Web の操作性のせいで縮まらない
- 稼働コーチが増え、iPad で作業したいという要望が複数出た

### 構成の見通し

```
コーチ iPad アプリ（React Native / Expo）──▶ HTTP API（Route Handler）──┐
                                                                        ├─▶ application（ユースケース）─▶ domain
Web（Next.js）── Server Component / Server Actions ─────────────────────┘
```

- server の `domain`・`application` はそのまま使う。presentation に HTTP API（`presentation/api.ts` と Route Handler）を足す
- フロントの `utils/`（座標計算・カードのデータ変換など）は、アプリでもそのまま使う
- 作り直すのは、画面・動画再生・線を描く部分
- そのためのルールは [コーディングルール](coding-rules.md#ネイティブアプリへの備え) にまとめた

### 選ばなかった案

- **Expo で Web とアプリを1つのコードで作る**：受付ページの表示速度や検索エンジン対策、Web での動画のコマ送り・線引きが弱く、検証段階で選ぶには代償が大きい
- **Capacitor で Web をアプリの形に包む**：アプリストアには早く出せるが、アプリ内課金の問題は同じで、動画まわりも Web と変わらない

## 必要なインフラ

MOC（段階0）では下表のどれも使わない（固定データのみ）。段階1・2で順に足す。

### Cloudflare

| 用途 | サービス | 段階 | 備考 |
|---|---|---|---|
| アプリ本体 | Workers ＋ Static Assets | 0〜 | vinext のビルド結果をそのまま載せる |
| DB | D1 | 1〜 | コーチ・生徒・スレッド・カード・チャット・決済記録。Drizzle でマイグレーション |
| 動画・画像 | R2 | 1〜 | 元動画、カード画像、アイコン。ブラウザから署名付きURLで直接PUT（Worker を経由しない） |
| 非同期処理 | Queues | 2〜 | LINE通知の送信と再送、動画アップロード後の後処理 |
| 定期処理 | Cron Triggers | 2〜 | スレッドの期限切れ処理、古い動画の削除、期限前のリマインド |
| メール | Email Service（`send_email`） | 1〜 | コーチのログイン用マジックリンク。届きにくければ Resend に切り替え |
| ボット対策 | Turnstile | 2〜 | 申し込みフォーム |
| 秘密情報 | Workers Secrets | 1〜 | Stripe・LINE のキー、R2 の S3 互換キー |
| ログ | Workers Logs | 1〜 | 段階2で Sentry を追加 |
| ドメイン | DNS（Cloudflare） | 2〜 | swingpost.jp などは未確認（計画書 13章） |

環境は `preview`（検証用）と `production` の2つ。D1・R2 も環境ごとに分ける。
料金は Workers Paid（月5ドル）が前提。Queues は有料プランでしか使えない。

### 外部サービス

| 用途 | サービス | 段階 | 備考 |
|---|---|---|---|
| 決済 | Stripe Connect（Express）＋ Billing | 1は決済リンク、2〜本実装 | Webhook は Route Handler で受ける |
| 生徒ログイン | LINE ログイン | 2〜 | 段階1はスレッドURLのトークンで代用 |
| 通知 | LINE Messaging API（共通公式アカウント） | 2〜 | **プッシュ通知は通数で課金される**。無料枠は月200通で、超えると有料プラン。原価に入れる |
| エラー監視 | Sentry | 2〜 | |
| CI/CD | GitHub Actions | 1〜 | 型チェック・lint・ビルド → `pnpm deploy`、D1 マイグレーション |

### 認証

Better Auth（外部サービスではなくライブラリ）を使い、ユーザー・セッションは D1 に持つ。生徒は LINE ログイン、コーチはメールの6桁コード、管理画面は Cloudflare Access。詳細とセキュリティ対策は [認証とセキュリティの方針](auth-and-security.md)。

### 要検証

- **iPhone の動画形式**：iPhone の標準設定（高効率）は HEVC の `.mov`。コーチが Windows や Android の Chrome で再生できない可能性がある。ブラウザで H.264 MP4 に変換し、スイング部分だけ切り出して送る（WebCodecs）のが第一候補。容量も減る
- **Queues・Cron の受け口**：vinext の Worker の入口（`vinext/server/fetch-handler`）は fetch だけを扱う。queue・scheduled の処理を同じ Worker に足せるか、別の Worker に分けるかを段階2の前に確認する
- **動画のサイズ**：Worker が受け取れるリクエストの上限があるため、アップロードはブラウザから R2 へ直接行う

### ローカル開発での扱い

| 本番 | ローカル | 確認 |
|---|---|---|
| Workers・D1・R2・Queues・Cron | Vite 開発サーバー内の workerd・Miniflare が再現（データは `.wrangler/state`） | D1・R2 はコンテナ内で動作確認済み |
| Stripe | テストモード＋ Stripe CLI の `stripe listen`（コンテナで追加可） | 段階1で追加 |
| LINE | テスト用チャネル。もしくは `infrastructure/external-services` をモックに差し替え | 段階2で追加 |
| メール | Miniflare はメールを送らずログに出す | 段階1で確認 |

コンテナでの開発手順は [README](../README.md) を参照。

## ディレクトリ構成

フロントエンドもバックエンドも**機能ごと（feature）**に分ける。フロントは `src/app/`、バックエンドは `src/server/`。

```
src/
├── app/                              フロントエンド（Next.js App Router）
│   ├── layout.tsx, page.tsx
│   ├── (student)/                    生徒向け（スマホ前提のレイアウト）
│   │   ├── c/[coachSlug]/page.tsx    受付ページ
│   │   └── t/[threadId]/page.tsx     閲覧ページ
│   ├── (coach)/                      コーチ向け（タブレット・PC前提のレイアウト）
│   │   └── coach/threads/[threadId]/
│   │       ├── page.tsx              添削画面
│   │       └── _components/          この画面だけで使う、feature を組み合わせた部品
│   ├── features/                     機能ごとの UI
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── utils/
│   ├── components/                   機能をまたいで使う UI（ui/ は見た目だけの部品）
│   ├── hooks/                        機能をまたいで使う hooks
│   └── utils/                        機能をまたいで使う関数
│
└── server/                           バックエンド（型と関数ベースの DDD）
    ├── features/
    │   └── <feature>/
    │       ├── domain/
    │       │   ├── values/           値オブジェクト・エンティティ（zod スキーマ＋ brand）
    │       │   ├── aggregates/       集約とファクトリ関数
    │       │   ├── services/         ドメインサービス（*.service.ts）
    │       │   ├── rules.ts          ルールの定数
    │       │   └── errors.ts         ドメインのエラー
    │       ├── application/
    │       │   ├── usecases/         ユースケース（*.usecase.ts）
    │       │   └── dto/              画面に返す形（*.dto.ts）
    │       ├── infrastructure/
    │       │   ├── repositories/     集約の保存・取得（D1）
    │       │   ├── query-services/   読み取り専用。DTO を直接返す
    │       │   └── external-services/ Stripe・LINE・R2 など
    │       └── presentation/
    │           ├── queries.ts        Server Component から呼ぶ読み取り口
    │           └── actions.ts        Server Actions（書き込み口）
    ├── auth/                         Better Auth の設定・ログイン中の利用者の取得（段階1）
    ├── db/                           D1 の接続・Drizzle スキーマ（段階1）
    ├── mocks/                        MOC 用の固定データ（段階1で削除）
    └── utils/                        機能をまたいで使う関数
```

いまある feature：

| 場所 | feature | 内容 |
|---|---|---|
| server | `coach` | コーチ・プラン・受付枠 |
| server | `thread` | スレッド・動画・添削カード・チャット |
| app | `coach-profile` | 受付ページの部品 |
| app | `thread` | スレッド一覧 |
| app | `video-player` | 添削画面の動画プレイヤー（スロー・コマ送り・端末の動画の読み込み） |
| app | `annotation` | 動画への線引き（直線・矢印・円・フリーハンド、3色、元に戻す） |

予定（MOC で追加）：app 側の `review-card`・`chat`。

### 依存の向き

```
app/ ──▶ server/features/*/presentation      （関数を呼ぶ）
app/ ──▶ server/features/*/application/dto   （型だけ）
app/ ──▶ server/features/*/domain/values     （型だけ）

presentation ──▶ application ──▶ domain
       └──────▶ infrastructure ──▶ domain
```

- `app/` から `infrastructure`・`usecases`・`mocks`・`db` は import できない（Biome で禁止）
- ユースケースは infrastructure を直接 import せず、関数を `dependencies` 引数で受け取る。組み立ては presentation で行う
- 書き方の詳細は [コーディングルール](coding-rules.md)
