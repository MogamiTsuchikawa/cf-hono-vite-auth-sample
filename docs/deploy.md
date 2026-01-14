# デプロイ手順

## 前提
- CloudflareのアカウントとAPIトークンを用意
- Google OAuthのClient ID/Secretを取得
- D1データベースを作成

## 1. wrangler.tomlの設定
```bash
cd backend
cp wrangler.toml.example wrangler.toml
```
- `wrangler.toml` を編集して以下の値を設定：
  - `account_id`: CloudflareのアカウントID
  - `AUTH_URL`: 本番のWorker URL（https）
  - `CORS_ORIGIN`: フロントエンドのURL（https）
  - サブドメインでCookieを共有する場合は `AUTH_COOKIE_DOMAIN` を `[vars]` に追加

## 2. D1データベース作成
```bash
cd backend
wrangler d1 create backend
```
- 出力された `database_id` を `wrangler.toml` の `database_id` に反映

## 3. D1マイグレーション適用
```bash
cd backend
wrangler d1 migrations apply backend --remote
```

## 3. Backendのシークレット設定
```bash
cd backend
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```
- `AUTH_URL` と `CORS_ORIGIN` は `backend/wrangler.toml` の `[vars]` に設定
- `AUTH_URL` は本番のWorker URL（https）を指定
- `CORS_ORIGIN` はフロントエンドのURL（https）を指定
- サブドメインでCookieを共有する場合は `AUTH_COOKIE_DOMAIN` を追加

## 4. Backendデプロイ
```bash
cd backend
wrangler deploy
```

## 5. Frontendビルド
```bash
cd frontend
npm install
npm run build
```

## 6. Frontendデプロイ（Cloudflare Pages推奨）
- プロジェクト作成時のビルド設定
  - Build command: `npm run build`
  - Build output: `dist`
- 環境変数
  - `VITE_API_BASE_URL`: `https://<worker-domain>`
  - `VITE_AUTH_BASE_URL`: `https://<worker-domain>`

## 7. Google OAuthのリダイレクトURI
- `https://<worker-domain>/auth/callback/google`

## 動作確認
- Backend: `https://<worker-domain>/health`
- Session: `https://<worker-domain>/auth/session`
- Frontend: `https://<pages-domain>`
