# AIAIshort (yt-analysis-tool)

## プロジェクト概要
ショート動画の分析・作成支援ツール。YouTubeショート動画を分析してレポート生成、キャプション生成、プロンプト生成を行う。

## デプロイ先
- **本番URL**: https://yt-analysis-tool-mu.vercel.app/
- **GitHub**: https://github.com/akariHasegawa/YT-analysis-tool
- **Vercel Project ID**: `prj_WN2WjfecTxVJldqfAxAirttxqQUV`
- **Vercel Team ID**: `team_edt5SVyNvomRXjJNtNhlZ7nL`
- **ローカルパス**: `C:\Users\Akari\OneDrive\デスクトップ\AIAI-short`

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router), React 19, TypeScript
- **スタイリング**: Tailwind CSS v4, shadcn/ui (Radix UI)
- **DB/認証**: Supabase
- **決済**: Stripe
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **その他**: YouTube Transcript API, Puppeteer (スクレイピング), Vercel Analytics

## 主要機能 (app/api)
- `/api/analyze` — 単体動画分析
- `/api/analyze-multi` — 複数動画一括分析
- `/api/generate-report` — レポート生成
- `/api/generate-multi-report` — マルチレポート生成
- `/api/generate-caption` — キャプション生成
- `/api/generate-prompt` — プロンプト生成
- `/api/video-metadata` — 動画メタデータ取得
- `/api/stripe/checkout` & `/api/stripe/webhook` — Stripe決済

## ページ構成
- `/dashboard` — メインダッシュボード
- `/auth` — 認証
- `/extension` — Chrome拡張機能ガイド
- `/faq`, `/privacy`, `/terms`, `/contact`

## Chrome拡張機能
`chrome-extension/` フォルダに拡張機能のコードあり。ビルド済みZIPは `chrome-extension.zip`。

## ローカル開発
```bash
npm run dev        # 開発サーバー (port 3000)
npm run build      # ビルド
npm run test       # テスト (Vitest)
```

## デプロイ方法
Vercel CLI または GitHub push で自動デプロイ。
```bash
vercel --prod   # 手動デプロイ
```

## 環境変数
`.env.example` を参照。`.env.local` に本番用の値を設定。

## Supabase
`supabase/` フォルダにマイグレーションファイルあり。
