import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createSupabaseAdmin, createSupabaseAnon } from "@/lib/supabase"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { VideoInfo } from "@/lib/video-info"

export const runtime = "nodejs"
export const maxDuration = 300

export type ReportType = "internal" | "client" | "script"

interface ReportRequest {
  analysis: ShortsAnalysis
  videoInfo: VideoInfo
  reportType: ReportType
  clientName?: string
  clientCompany?: string
  accountMemo?: string
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function buildInternalReportHtml(req: ReportRequest): string {
  const { analysis, videoInfo, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  const score = analysis.retentionScore ?? 0
  const reasons = analysis.retentionReasons ?? []
  const improvements = analysis.improvementIdeas ?? []
  const nextIdeas = analysis.nextVideoIdeas ?? []

  const reasonItems = reasons.map(r => `<li style="margin-bottom:6px">${esc(r)}</li>`).join("")
  const improvementItems = improvements.map((item, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #1e2433">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${i + 1}</span>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")
  const nextIdeaItems = nextIdeas.map((item, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #1e2433">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${i + 1}</span>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")

  const cc = analysis.competitorComparison
  const competitorBlock = cc ? `
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <h2 style="margin:0 0 16px;font-size:14px;font-weight:700;color:#f59e0b;letter-spacing:.05em">競合比較</h2>
      ${[
        { label: "競合の強み", items: cc.competitorStrengths },
        { label: "自社の弱み", items: cc.yourWeaknesses },
        { label: "優先改善点", items: cc.priorityImprovements },
      ].map(({ label, items }) => `
        <p style="font-size:11px;color:#64748b;margin:12px 0 4px">${label}</p>
        <ul style="padding-left:16px;color:#cbd5e1;font-size:13px;line-height:1.8">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
      `).join("")}
    </div>` : ""

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; color: #e2e8f0; font-family: "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif; padding: 32px; }
  @page { size: A4; margin: 0; }
</style></head>
<body>
  <div style="max-width:860px;margin:0 auto">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1e2433">
      <div>
        <p style="font-size:10px;letter-spacing:.2em;color:#64748b;margin-bottom:6px">INTERNAL ANALYSIS REPORT</p>
        <h1 style="font-size:26px;font-weight:800;color:#fff">動画分析レポート</h1>
      </div>
      <div style="text-align:right">
        <p style="font-size:12px;color:#64748b">作成日</p>
        <p style="font-size:16px;font-weight:700;color:#6366f1">${today}</p>
        <p style="font-size:11px;color:#475569;margin-top:4px">${esc(videoInfo.url ?? "")}</p>
      </div>
    </div>

    <!-- Video Info -->
    <div style="background:#12161f;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <p style="font-size:10px;color:#64748b;margin-bottom:4px">タイトル</p>
        <p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(videoInfo.title)}</p>
      </div>
      <div>
        <p style="font-size:10px;color:#64748b;margin-bottom:4px">チャンネル / アカウント</p>
        <p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(accountMemo || videoInfo.channelName)}</p>
      </div>
      ${videoInfo.views ? `<div><p style="font-size:10px;color:#64748b;margin-bottom:4px">再生数</p><p style="font-size:14px;font-weight:600;color:#e2e8f0">${videoInfo.views.toLocaleString("ja-JP")}</p></div>` : ""}
      ${videoInfo.publishedAt ? `<div><p style="font-size:10px;color:#64748b;margin-bottom:4px">公開日</p><p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(videoInfo.publishedAt)}</p></div>` : ""}
    </div>

    <!-- Score -->
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
        <div style="text-align:center">
          <p style="font-size:52px;font-weight:800;color:#6366f1;line-height:1">${score}</p>
          <p style="font-size:11px;color:#64748b">/ 100</p>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <p style="font-size:13px;font-weight:600;color:#e2e8f0">視聴維持率スコア</p>
            <span style="background:#6366f1;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px">${esc(analysis.retentionLabel ?? "")}</span>
          </div>
          <div style="background:#1e2433;border-radius:4px;height:10px;overflow:hidden">
            <div style="width:${score}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6)"></div>
          </div>
          ${reasonItems ? `<ul style="margin-top:12px;padding-left:16px;color:#94a3b8;font-size:12px;line-height:1.8">${reasonItems}</ul>` : ""}
        </div>
      </div>
    </div>

    <!-- HOOK / EMOTION / CTA / STRUCTURE -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      ${[
        { label: "HOOK", color: "#6366f1", block: analysis.hook },
        { label: "EMOTION", color: "#f59e0b", block: analysis.emotion },
        { label: "CTA", color: "#10b981", block: analysis.cta },
        { label: "STRUCTURE", color: "#8b5cf6", block: analysis.structure },
      ].map(({ label, color, block }) => `
        <div style="background:#12161f;border-left:3px solid ${color};border-radius:0 12px 12px 0;padding:16px">
          <p style="font-size:10px;letter-spacing:.1em;color:${color};font-weight:700;margin-bottom:4px">${label}</p>
          <p style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px">${esc(block.value)}</p>
          <p style="font-size:12px;line-height:1.7;color:#94a3b8">${esc(block.description)}</p>
        </div>`).join("")}
    </div>

    ${competitorBlock}

    <!-- Improvement Ideas -->
    ${improvements.length ? `
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <h2 style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">改善アイデア</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">Improvement Ideas</p>
      ${improvementItems}
    </div>` : ""}

    <!-- Next Video Ideas -->
    ${nextIdeas.length ? `
    <div style="background:#12161f;border-radius:12px;padding:24px">
      <h2 style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">次の動画アイデア</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">Next Video Ideas</p>
      ${nextIdeaItems}
    </div>` : ""}
  </div>
</body>
</html>`
}

function buildPrompt(req: ReportRequest): string {
  const { analysis, videoInfo, reportType, clientName, clientCompany } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })

  const analysisJson = JSON.stringify(
    {
      hook: analysis.hook,
      emotion: analysis.emotion,
      cta: analysis.cta,
      structure: analysis.structure,
      retentionScore: analysis.retentionScore,
      retentionLabel: analysis.retentionLabel,
      retentionReasons: analysis.retentionReasons,
      improvementIdeas: analysis.improvementIdeas,
      nextVideoIdeas: analysis.nextVideoIdeas,
      competitorComparison: analysis.competitorComparison ?? null,
    },
    null,
    2
  )

  const videoMeta = `
タイトル: ${videoInfo.title}
チャンネル: ${videoInfo.channelName}
再生数: ${videoInfo.views?.toLocaleString("ja-JP") ?? "不明"}
動画時間: ${videoInfo.durationSeconds ? `${Math.floor(videoInfo.durationSeconds / 60)}分${videoInfo.durationSeconds % 60}秒` : "不明"}
公開日: ${videoInfo.publishedAt ?? "不明"}
`

  if (reportType === "internal") {
    return `以下の動画分析結果をもとに、自分用の内部レポートをHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ（必ずこのデータをそのままHTMLに埋め込むこと。プレースホルダー禁止）
${analysisJson}

## 要件
- 日本語で記述
- 上記の分析データの値をそのままHTMLに埋め込む（空のボックスを作らない）
- 全データを詳細に記載（改善アイデア・次の動画アイデアも全て）
- 視聴維持率スコアをグラフ的に表現（CSSで）
- ダークテーマ（背景 #0f1117、テキスト #e2e8f0）
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- マークダウンのコードブロック（\`\`\`html）は使わず、HTMLを直接返す
- インラインCSSのみ使用（外部CSSなし）
- 日付: ${today}
- レイアウト：A4横向きに最適化
- 改善提案・次の動画アイデアはリスト形式で見やすく`
  }

  if (reportType === "client") {
    return `以下の動画分析結果をもとに、クライアント提出用のプロフェッショナルなレポートをHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ
${analysisJson}

## クライアント情報
会社名: ${clientCompany ?? ""}
担当者: ${clientName ?? ""}
日付: ${today}

## 要件
- 丁寧な日本語（です・ます調）
- クライアントに伝わりやすい表現（専門用語を避ける）
- 会社名・担当者名・日付をヘッダーに記載
- ロゴ代わりに「AI動画分析レポート」のタイトルをデザイン
- 改善提案はポジティブな表現で（「〜するとさらに効果的です」など）
- 視聴維持率・改善点・次回推奨アクション（3点）を重点的に記載
- ライトテーマ（背景 #ffffff、アクセント #6366f1）
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- インラインCSSのみ使用
- A4縦向きに最適化
- 印刷に適したデザイン`
  }

  // script
  return `以下の動画分析結果をもとに、クライアントへのプレゼンテーション用台本をHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ
${analysisJson}

## クライアント情報
会社名: ${clientCompany ?? ""}
担当者: ${clientName ?? ""}
日付: ${today}

## 要件
- 話し言葉（「〜ですね」「〜なんです」など自然な口語）
- 所要時間の目安（各セクションに「約○分」を記載）
- 構成: 挨拶→分析概要→詳細説明→改善提案→次回アクション→まとめ
- 重要ポイントには「★」マーク
- 質問への想定回答も含める
- ライトテーマ（背景 #f8f9fa）
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- インラインCSSのみ使用
- A4縦向きに最適化`
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium-min")).default
  const puppeteer = (await import("puppeteer-core")).default

  const isLocal = process.env.NODE_ENV !== "production"

  const executablePath = isLocal
    ? undefined
    : await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      )

  const browser = await puppeteer.launch(
    isLocal
      ? { headless: true, channel: "chrome" }
      : {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: chromium.headless,
        }
  )

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16px", right: "16px", bottom: "16px", left: "16px" },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export async function POST(req: NextRequest) {
  // 認証チェック
  const authHeader = req.headers.get("authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!accessToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const supabase = createSupabaseAnon()
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // Businessプランチェック
  const admin = createSupabaseAdmin()
  const { data: userData } = await admin
    .from("users")
    .select("plan")
    .eq("id", authData.user.id)
    .single()

  if (userData?.plan !== "business") {
    return NextResponse.json({ error: "BUSINESS_PLAN_REQUIRED" }, { status: 403 })
  }

  let body: ReportRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { analysis, videoInfo, reportType, clientName, clientCompany, accountMemo } = body
  if (!analysis || !videoInfo || !reportType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    let html: string
    if (reportType === "internal") {
      // 内部用はテンプレートで直接生成（Claude不要）
      html = buildInternalReportHtml({ analysis, videoInfo, reportType, clientName, clientCompany, accountMemo })
    } else {
      // クライアント用・台本はClaudeで生成してHTMLのまま返す（ブラウザでprint→PDF）
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildPrompt({ analysis, videoInfo, reportType, clientName, clientCompany }),
          },
        ],
      })
      html = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
      html = html.replace(/^```html\s*/i, "").replace(/\s*```\s*$/, "")

      // 印刷ボタンを先頭に注入
      const printBtn = `<div style="position:fixed;top:16px;right:16px;z-index:9999;display:flex;gap:8px">
        <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨 PDFで保存</button>
        <button onclick="window.close()" style="background:#374151;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer">✕</button>
      </div><style>@media print{button{display:none!important}}</style>`
      html = html.replace(/<body[^>]*>/i, (m) => `${m}${printBtn}`)

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Report-Type": "html" },
      })
    }

    // 内部用のみPDF変換
    const pdfBuffer = await htmlToPdf(html)

    const typeLabels: Record<ReportType, string> = {
      internal: "内部用",
      client: "クライアント用",
      script: "台本",
    }
    const filename = `分析レポート_${typeLabels[reportType]}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    console.error("[generate-report] error", e)
    return NextResponse.json({ error: "レポート生成に失敗しました" }, { status: 500 })
  }
}
