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

段階2までの実装はすべて1つの Worker に入っている（`src/worker.ts` が vinext の fetch を包み、queue・scheduled を足す）。

### Cloudflare

| 用途 | サービス | 備考 |
|---|---|---|
| アプリ本体 | Workers ＋ Static Assets | vinext のビルド結果をそのまま載せる |
| DB | D1 | ユーザー・コーチ・プラン・申し込み・レッスン・提出・動画・カード・チャット・ドリル・レビュー。Drizzle でマイグレーション（`migrations/`） |
| 動画・画像 | R2 | 生徒の動画とカード画像。非公開のまま使う。アップロードは Worker が受けて R2 へ流し（100MB まで）、配信は権限を確かめる Route Handler から Range 付きで返す |
| 通知 | Queues（`swingpost-notifications`） | LINE・メールの送信。失敗したら5回まで再送 |
| 定期処理 | Cron Triggers（毎日4:00・9:00 JST） | 4:00：期限切れの終了、期限前のお知らせ、返信の期限（48時間）を過ぎたコーチへのお知らせ、古い動画の削除、キャンセル待ちへの連絡。9:00：不在が明けたコーチへ、不在中に届いた件数のお知らせ。どちらの処理かは `src/worker.ts` が cron の値で見分ける |
| メール | Email Service（`send_email`） | コーチのログインコードとお知らせ。届きにくければ Resend に切り替え |
| 秘密情報 | Workers Secrets | 一覧は `.dev.vars.example` |
| ログ | Workers Logs | Sentry は未導入 |
| 管理画面 | Cloudflare Access | `/admin` を守る。アプリでも Access の JWT を検証する。コーチの招待・受付の停止、レッスンの一覧（返信の遅れ）、返金（全額。コーチへの送金も取り戻す） |
| ドメイン | DNS（Cloudflare） | 未確認（計画書 13章） |

環境は `staging` と `production`。Worker・D1・R2・キューは環境ごとに分ける（`cloudflare.config.ts` が mode で名前を変える）。
料金は Workers Paid（月5ドル）が前提。Queues は有料プランでしか使えない。

### 外部サービス

| 用途 | サービス | 備考 |
|---|---|---|
| 決済 | Stripe Connect（Accounts v2、Express ダッシュボード）＋ Billing | destination charge（on_behalf_of なし）で手数料10%。コーチの口座は送金を受ける recipient の設定だけ。月額はサブスクリプション。Webhook は `/api/webhooks/stripe`。口座の状態は、設定から戻ったときと設定画面を開いたときに Stripe に問い合わせる |
| 生徒ログイン | LINE ログイン | Better Auth の LINE プロバイダー |
| 通知 | LINE Messaging API（共通公式アカウント） | **プッシュ通知は通数で課金される**。無料枠は月200通で、超えると有料プラン。原価に入れる。友だち追加は `/api/webhooks/line` で記録 |
| CI/CD | GitHub Actions | `ci.yml`（check・build）、`deploy.yml`（手動。マイグレーション → デプロイ） |
| エラー監視 | Sentry | 未導入 |

### 返信目安と不在

コーチの返信目安は48時間。守れない期間は、コーチが不在期間（日付。日本時間）か返信遅れフラグ（7日で自動で外れる）を登録する。

- 判定はすべて domain：コーチの今の状態は coach の `calcCoachAvailability`、申し込みの扱いは `decideSignupGuard`、送る前の確認は thread の `decideSendGuard`、レッスンの期限は `calcEffectiveExpiry`（保存値は書き換えず、不在日数だけ延ばして計算）、返信の期限は `calcReplyDueAt`
- 数値（48時間・7日など）は coach の `AVAILABILITY_RULES` にまとめる。画面の文言は `app/features/coach-availability/utils/availabilityText.ts`
- 不在中に届いた動画・チャットには `sent_during_absence_id` を残す（あとで返信時間を集計するとき除くため）

### 認証

Better Auth（外部サービスではなくライブラリ）を使い、ユーザー・セッションは D1 に持つ。生徒は LINE ログイン、コーチはメールの6桁コード、管理画面は Cloudflare Access。詳細とセキュリティ対策は [認証とセキュリティの方針](auth-and-security.md)。

### 要検証・未対応

- **動画の変換**：送る前にブラウザで H.264 の MP4（音声なし、長辺1920px まで、フレームレートは元のまま）に変換し、選んだ範囲（20秒まで）だけを送る（Mediabunny・WebCodecs、`app/features/video-upload`）。変換できないブラウザでは元のファイルを100MB まで送る。iPhone の実機での変換の速さは未確認
- **iPhone Safari のコマ送りと指での線引き**：実機で未確認
- **外部サービスのつなぎ込み**：Stripe・LINE・Email Service を実際のアカウントで通した確認はまだ
- **未導入**：Sentry、申し込みの Turnstile、チャット・アップロードの回数制限（コードの送信だけ制限済み）、骨格推定による自動キャプチャ

### ローカル開発での扱い

| 本番 | ローカル |
|---|---|
| Workers・D1・R2・Queues・Cron | Vite 開発サーバー内の workerd・Miniflare が再現（データはコンテナのボリューム）。マイグレーションは開発サーバーが自動で流す。Cron は `/cdn-cgi/local/scheduled` で手で動かす |
| Stripe | テストモード＋ `stripe listen`。キーがなくても `/api/dev/purchase` でレッスンを作れる |
| LINE・メール | 送らずにログに出す |
| ログイン | コードはログに出る。生徒もメールのコードでログインできる |

コンテナでの開発手順は [README](../README.md) を参照。

## ディレクトリ構成

フロントエンドもバックエンドも**機能ごと（feature）**に分ける。フロントは `src/app/`、バックエンドは `src/server/`。

```
src/
├── worker.ts                         Worker の入口（fetch は vinext、queue・scheduled を足す）
├── app/                              フロントエンド（Next.js App Router）
│   ├── layout.tsx, page.tsx
│   ├── (student)/                    生徒向け（スマホ前提）：受付・申し込み・マイページ・閲覧
│   ├── (coach)/                      コーチ向け（タブレット・PC前提）：ホーム・添削・ドリル・設定
│   │   └── coach/threads/[threadId]/
│   │       ├── page.tsx              添削画面
│   │       └── _components/          この画面だけで使う、feature を組み合わせた部品
│   ├── admin/                        管理画面（Cloudflare Access の奥）
│   ├── legal/                        利用規約・プライバシーポリシー・特商法の表記
│   ├── api/                          Route Handler（認証、Webhook、動画のアップロード・配信）
│   ├── features/<feature>/           機能ごとの UI（components・hooks・utils）
│   ├── components/                   機能をまたいで使う UI（ui/ は見た目だけの部品）
│   ├── hooks/                        機能をまたいで使う hooks
│   └── utils/                        機能をまたいで使う関数
│
└── server/                           バックエンド（型と関数ベースの DDD）
    ├── features/
    │   └── <feature>/
    │       ├── domain/
    │       │   ├── values/           値オブジェクト・エンティティ（zod スキーマ＋ brand）
    │       │   ├── services/         ドメインサービス（*.service.ts）
    │       │   └── rules.ts          ルールの定数
    │       ├── application/
    │       │   ├── usecases/         ユースケース（*.usecase.ts）とテスト
    │       │   └── dto/              画面に返す形（*.dto.ts）
    │       ├── infrastructure/
    │       │   ├── repositories/     D1 の読み書き
    │       │   ├── query-services/   読み取り専用。DTO を直接返す
    │       │   └── external-services/ Stripe・LINE・R2・キューなど
    │       ├── presentation/
    │       │   ├── queries.ts        Server Component から呼ぶ読み取り口
    │       │   ├── actions.ts        Server Actions（書き込み口）
    │       │   └── *Routes.ts など   Route Handler・Webhook・queue・scheduled の受け口
    │       └── public.ts             ほかの feature に公開する関数（境界は coding-rules.md「feature の境界」）
    ├── auth/                         Better Auth の設定・ログイン中の利用者の取得
    ├── db/                           D1 の接続・Drizzle スキーマ・開発用のマイグレーション
    └── utils/                        機能をまたいで使う関数（Result 型、Stripe クライアントなど）
```

いまある feature：

| 場所 | feature | 内容 |
|---|---|---|
| server | `coach` | コーチ・プラン・受付枠・招待・売上の口座（Stripe Connect） |
| server | `purchase` | 申し込み・決済（Checkout・Webhook）・キャンセル待ち |
| server | `thread` | レッスン・提出（動画1〜2本）・添削カード・チャット・毎日の処理 |
| server | `drill` | ドリル |
| server | `coach-review` | コーチへのレビュー |
| server | `notification` | 通知（キュー・LINE・メール） |
| server | `monitor` | モニター募集のプロモーションコード（コーチが発行。1レッスンをモニター価格で。0円なら無料） |
| server | `demo` | デモのコーチ（staging だけ）。管理画面から作り、架空の生徒・レッスンを入れる。デモ用のリンク（`/api/auth/demo-login`）でログインし、7日で消す。デモのあいだは通知を送らず、Stripe も呼ばない |
| server | `share` | 添削の公開の許可（コーチと生徒の組ごと。申し込みのときに聞き、マイページで変えられる。履歴を残す） |
| app | `coach-profile` | 受付ページの部品 |
| app | `coach-settings`・`admin` | 設定画面・管理画面のフォーム |
| app | `apply` | プランの選択・キャンセル待ち |
| app | `thread`・`video-upload` | レッスン一覧・時系列・提出（動画の変換と送信） |
| app | `video-player`・`annotation`・`review-card`・`chat` | 添削の道具（再生・線引き・カード・チャット） |
| app | `drill`・`coach-review`・`notification`・`auth` | ドリル・レビュー・LINE の友だち追加の案内・ログイン |
| app | `monitor`・`share` | プロモーションコードの設定・公開の許可（変更のフォームと、コーチへの表示） |
| app | `share-image` | シェア画像の作成（ブラウザだけで組み立て・顔のぼかし。顔の検出は MediaPipe を作る画面でだけ CDN から読み込む）。いまは `SHARE_IMAGE_ENABLED` で画面に出していない |

### 依存の向き

```
app/ ──▶ server/features/*/presentation      （関数を呼ぶ）
app/ ──▶ server/features/*/application/dto   （型だけ）
app/ ──▶ server/features/*/domain/values     （型だけ）

presentation ──▶ application ──▶ domain
       └──────▶ infrastructure ──▶ domain
```

- `app/` から `infrastructure`・`usecases`・`db` は import できない（Biome で禁止）
- feature 同士は、相手の `domain`・`application/dto`・`public.ts` だけを使う（Biome で禁止）
- ユースケースは infrastructure を直接 import せず、関数を `dependencies` 引数で受け取る。組み立ては presentation で行う
- 書き方の詳細は [コーディングルール](coding-rules.md)
