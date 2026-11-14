# SwingPost

ゴルフのレッスンプロが、インスタのフォロワーにスイング動画の添削を月額で届けられるサービス。

いまは **段階0：Webモック**（バックエンドなし、データは `src/server/mocks/`）。

## ドキュメント

- [サービス計画](docs/service-plan.md)
- [MOCでつくる機能](docs/moc-scope.md)
- [インフラ構成とディレクトリ構成](docs/architecture.md)
- [コーディングルール](docs/coding-rules.md)
- [認証とセキュリティの方針](docs/auth-and-security.md)

## 技術

Next.js（App Router）を [vinext](https://vinext.dev) で Vite 上に載せ、Cloudflare Workers にデプロイする。スタイルは Tailwind CSS v4、lint・フォーマットは Biome。

## 開発

### コンテナで動かす

Docker があればホストに Node.js は不要。

```bash
docker compose up
```

http://localhost:5173 で開く。ソースはマウントしているので、保存すると反映される。`node_modules` はコンテナ側のボリュームに持つ（macOS と Linux でバイナリが違うため）。

ローカルの D1・R2 のデータはコンテナのボリューム（`cloudflare-state`）に入る。消して作り直すときは `docker compose down -v`（`node_modules` のボリュームも消える）。マイグレーションは開発サーバーが最初のリクエストで自動で流す。

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

### コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー（Workers のランタイムでローカル実行） |
| `pnpm check` | 型チェック＋lint |
| `pnpm lint:fix` | lint・フォーマットの自動修正 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | ビルドした Worker をローカルで確認 |
| `pnpm deploy` | Cloudflare Workers へデプロイ（要ログイン） |
