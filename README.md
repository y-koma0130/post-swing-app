# SwingPost

ゴルフのレッスンプロが、インスタのフォロワーにスイング動画の添削を月額で届けられるサービス。

段階2（正式リリース）の機能を実装中。外部サービス（Stripe・LINE・Cloudflare の本番環境）のつなぎ込みは未確認。

## ドキュメント

- [サービス計画](docs/service-plan.md)
- [インフラ構成とディレクトリ構成](docs/architecture.md)
- [コーディングルール](docs/coding-rules.md)
- [認証とセキュリティの方針](docs/auth-and-security.md)
- [MOCでつくった機能](docs/moc-scope.md)（段階0。役目は終えた）

## 技術

Next.js（App Router）を [vinext](https://vinext.dev) で Vite 上に載せ、Cloudflare Workers にデプロイする。データは D1（Drizzle）、動画は R2、通知は Queues、毎日の処理は Cron。認証は Better Auth、決済は Stripe Connect。スタイルは Tailwind CSS v4、lint・フォーマットは Biome、テストは Vitest。

## 開発

### 準備

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` の `BETTER_AUTH_SECRET` に、`openssl rand -base64 32` で作った値を入れる。ほかは空でも動く（Stripe・LINE を使う画面だけ動かない）。

### コンテナで動かす

Docker があればホストに Node.js は不要。

```bash
docker compose up
```

http://localhost:5173 で開く。ソースはマウントしているので、保存すると反映される。

- `node_modules` と、ローカルの D1・R2 のデータ（`.cloudflare/state`）はコンテナ側のボリュームに持つ。SQLite を macOS とのファイル共有越しに使うと壊れることがあるため。ホストから `.cloudflare/state` の SQLite を開かないこと
- マイグレーションは、開発サーバーが最初のリクエストで自動で流す
- データを消して作り直すときは `docker compose down -v`（`node_modules` のボリュームも消える）

コンテナ内でコマンドを打つときは次のようにする。

```bash
docker compose exec app pnpm check
```

### ホストで動かす

Node.js 24 と pnpm 10 が必要。

```bash
pnpm install
pnpm dev
```

### 手元で一通り試す

開発中は、ログインのコード・LINE の通知・メールを送らずに、サーバーのログに出す。

1. 管理画面 http://localhost:5173/admin でコーチを招待する（開発中は誰でも開ける）
2. http://localhost:5173/coach/login で、招待したメールアドレスにコードを送る。コードはログに出る（`docker compose logs app | grep -a ログインコード`）
3. 生徒は http://localhost:5173/login の「開発用：メールのコードでログイン」で入る（LINE のチャネルがなくても試せる）
4. Stripe を通さずにスレッドを作る：生徒でログインしたまま `http://localhost:5173/api/dev/purchase?coach=<スラッグ>&plan=single` を開く（本番では 404）
5. マイページから動画を送り、コーチの添削画面でカードを作って返す
6. 毎日の処理を手で動かす：`curl "http://localhost:5173/cdn-cgi/local/scheduled?cron=0+19+*+*+*"`

### Stripe を試す

テストモードのキーを `.dev.vars` の `STRIPE_SECRET_KEY` に入れる。Webhook は Stripe CLI で手元に転送し、表示された `whsec_…` を `STRIPE_WEBHOOK_SECRET` に入れる。

```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe --forward-connect-to localhost:5173/api/webhooks/stripe
```

### コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー（Workers のランタイムでローカル実行） |
| `pnpm check` | 型チェック＋lint＋テスト（コミット前に必ず通す） |
| `pnpm test` | テストだけ（`pnpm test:watch` で監視） |
| `pnpm lint:fix` | lint・フォーマットの自動修正 |
| `pnpm db:generate` | `src/server/db/schema` からマイグレーションの SQL を作る |
| `pnpm build` | 本番ビルド |
| `pnpm deploy:staging` / `pnpm deploy:production` | Cloudflare Workers へデプロイ（要ログイン） |
| `pnpm db:migrate:remote` | 環境変数 `D1_DATABASE_ID` の D1 にマイグレーションを当てる |

## デプロイ

GitHub Actions の「Deploy」を手動で動かす（`.github/workflows/deploy.yml`）。環境は `staging` と `production` で、Worker・D1・R2・キューは環境ごとに別（`cloudflare.config.ts`）。

Workers Secrets に、`.dev.vars.example` にある名前で値を入れる。本番では次も必要。

- `APP_URL`：公開URL
- `EMAIL_FROM`：Cloudflare Email Service で送信を許可したアドレス
- LINE ログイン・Messaging API のチャネル（同じプロバイダーの下に作る）。Messaging API の Webhook URL は `<APP_URL>/api/webhooks/line`
- Stripe の Webhook：同じ `<APP_URL>/api/webhooks/stripe` に、エンドポイントを2つ作る。自分のアカウント用（`checkout.session.completed`・`invoice.paid`・`customer.subscription.deleted`）の署名シークレットを `STRIPE_WEBHOOK_SECRET` に、Connect 用（`account.updated`）を `STRIPE_CONNECT_WEBHOOK_SECRET` に入れる
- `/admin` を Cloudflare Access で守り、`ACCESS_TEAM_DOMAIN`・`ACCESS_AUD` を入れる
