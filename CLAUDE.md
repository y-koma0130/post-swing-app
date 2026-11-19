# SwingPost

ゴルフのスイング動画添削サービス。いまは段階2（正式リリース）の機能を実装中。外部サービス（Stripe・LINE・本番の Cloudflare）とのつなぎ込みは未確認。

- 計画: `docs/service-plan.md`（MOC の記録は `docs/moc-scope.md`）
- 構成: `docs/architecture.md`、コーディングルール: `docs/coding-rules.md`（必ず従う）
- 認証・セキュリティ: `docs/auth-and-security.md`（Better Auth＋D1。権限の確認はユースケースで必ず行う）
- UI（色・文字の大きさ・部品・押したときの反応・文言）: `docs/ui-rules.md`（画面を作る・直すときは必ず従う）

## 要点

- フロントは `src/app/`、バックエンドは `src/server/`。どちらも feature ごとに分ける
- server は zod スキーマ＋brand の値オブジェクトと、「関数の型を export → 同名 const で実装」の DDD 風。ユースケースは `(params, dependencies)`
- `any`・`as`（`as const` 以外）・`!`・`@ts-ignore` は禁止
- `app/` から server の `infrastructure`・`usecases`・`db` は import しない
- 書き込みは Server Actions（`presentation/actions.ts`）
- 将来コーチ向けのネイティブアプリを足す前提。server の domain・application とフロントの `utils/` は Next.js・React・DOM に依存させない（`docs/coding-rules.md` の「ネイティブアプリへの備え」）
- 変更後は `pnpm check`（型・lint・テスト）を通す。ユースケースには権限とルールのテストを書く
- 開発中の動かし方（ログインコード、/api/dev/purchase、Cron の手動実行）は README
- 実行環境は vinext + Cloudflare Workers。`"use cache"`・PPR・`sharp` などのネイティブモジュールは使わない
