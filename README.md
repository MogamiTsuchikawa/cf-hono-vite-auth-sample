# Auth.js + Hono + D1 サンプル

Cloudflare Workers上で動く Auth.js 認証サンプルです。バックエンドは Hono + Auth.js、DB は D1、フロントエンドは Vite + React で構成しています。Google OAuth とメール/パスワード（Credentials）のログインに対応します。

## 構成
- `backend/`: Hono + Auth.js + D1
- `frontend/`: Vite + React
- `docs/deploy.md`: デプロイ手順

## ローカル開発
### 1. 依存関係のインストール
```bash
npm install
```

### 2. D1の作成とマイグレーション
```bash
cd backend
wrangler d1 create backend
wrangler d1 migrations apply backend --local
```
- `wrangler d1 create` の結果から `backend/wrangler.toml` の `database_id` を設定してください。

### 3. 環境変数
`backend/.dev.vars`（例）
```
AUTH_SECRET=your-secret
AUTH_URL=http://localhost:8787
CORS_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

`frontend/.env.local`（例）
```
VITE_API_BASE_URL=http://localhost:8787
VITE_AUTH_BASE_URL=http://localhost:8787
```

### 4. 起動
```bash
npm run dev:backend
npm run dev:frontend
```

## Google OAuth リダイレクトURI
- ローカル: `http://localhost:8787/auth/callback/google`

## デプロイ
- `docs/deploy.md` を参照してください。
