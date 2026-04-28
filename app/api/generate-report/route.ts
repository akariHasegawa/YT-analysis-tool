import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createSupabaseAdmin, createSupabaseAnon } from "@/lib/supabase"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { VideoInfo } from "@/lib/video-info"

export const runtime = "nodejs"
export const maxDuration = 60

export type ReportType = "internal" | "client" | "script"

interface ReportRequest {
  analysis: ShortsAnalysis
  videoInfo: VideoInfo
  reportType: ReportType
  clientName?: string
  clientCompany?: string
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

## 分析データ
${analysisJson}

## 要件
- 日本語で記述
- 全データを詳細に記載（改善アイデア・次の動画アイデアも全て）
- 視聴維持率スコアをグラフ的に表現（CSSで）
- ダークテーマ（背景 #0f1117、テキスト #e2e8f0）
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
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

  const { analysis, videoInfo, reportType, clientName, clientCompany } = body
  if (!analysis || !videoInfo || !reportType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    // Claude でHTML生成
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt({ analysis, videoInfo, reportType, clientName, clientCompany }),
        },
      ],
    })

    const html = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    // HTMLをPDFに変換
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
