import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { detectPlatform } from "@/lib/platforms/types"
import { extractYouTubeVideoId } from "@/lib/youtube-video-id"
import { fetchYouTubeTranscriptLines } from "@/lib/youtube-transcript-lines"
import { fetchOpenAIChatCompletions } from "@/lib/openai-chat"
import {
  buildUnifiedAnalysisSystemPrompt,
  parseUnifiedOpenAiAnalysisContent,
} from "@/lib/unified-analysis-openai"
import {
  assertSupabaseForAnalyze,
  checkAnalysisLimit,
  fetchUserUsageRow,
  incrementUserAnalysisCounts,
  isAnalysisLimitDisabled,
} from "@/lib/analysis-usage"
import { createSupabaseAdmin, createSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { MultiVideoAnalysis, MultiVideoSummary } from "@/lib/multi-video-analysis"

const bodySchema = z.object({
  urls: z.array(z.string().min(1)).min(2).max(5),
})

// YouTube oEmbed でタイトルを取得
async function fetchYouTubeTitle(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return url
    const data = (await res.json()) as { title?: string; author_name?: string }
    return data.title || url
  } catch {
    return url
  }
}

// 1本の動画を個別分析（analyze/route.ts と同じロジック）
async function analyzeSingleVideo(
  url: string,
  apiKey: string,
  model: string
): Promise<{ analysis: ShortsAnalysis; title: string } | null> {
  const platform = detectPlatform(url)
  if (!platform) return null

  // タイトル取得
  const title = platform === "youtube" ? await fetchYouTubeTitle(url) : url

  // 字幕取得（YouTubeのみ）
  let transcript = ""
  if (platform === "youtube") {
    const vid = extractYouTubeVideoId(url)
    if (vid) {
      try {
        transcript = (await fetchYouTubeTranscriptLines(vid, { durationHintSec: null }))?.trim() ?? ""
      } catch { /* 字幕なし */ }
    }
  }

  const isVisualContent = platform === "tiktok" || platform === "instagram"
  const hasTranscript = Boolean(transcript) && !isVisualContent

  const systemPrompt = buildUnifiedAnalysisSystemPrompt("research", false, false, isVisualContent)

  const userContent = `動画URL: ${url}
動画タイトル: ${title}
チャンネル名: 不明
${hasTranscript
  ? `\n--- 字幕（秒付き） ---\n${transcript.slice(0, 11000)}`
  : isVisualContent
  ? "（字幕・音声なし：ビジュアル系コンテンツとして分析）"
  : "（字幕・音声なし：ビジュアル系コンテンツとして分析）"}
上記をもとに、システム指示のとおり analysis / structureTimeline / referenceInsights を含む1つのJSONのみを返してください。`

  let res: Response
  try {
    res = await fetchOpenAIChatCompletions(
      apiKey,
      {
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      },
      { maxRetries: 3 }
    )
  } catch {
    return null
  }

  if (!res.ok) return null

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = completion.choices?.[0]?.message?.content
  if (!content) return null

  const parsed = parseUnifiedOpenAiAnalysisContent(content, { durationSec: null, sourceThumbnailUrl: undefined })
  if (!parsed.ok) return null

  return { analysis: parsed.value.analysis, title }
}

// 個別分析結果から共通パターンを抽出
async function extractCommonPatterns(
  videos: Array<{ url: string; title: string; analysis: ShortsAnalysis }>,
  apiKey: string,
  model: string
): Promise<MultiVideoAnalysis | null> {
  const summaryJson = videos.map((v) => ({
    url: v.url,
    title: v.title,
    hook: v.analysis.hook,
    emotion: v.analysis.emotion,
    cta: v.analysis.cta,
    structure: v.analysis.structure,
    retentionScore: v.analysis.retentionScore,
    retentionLabel: v.analysis.retentionLabel,
    retentionReasons: v.analysis.retentionReasons,
    improvementIdeas: v.analysis.improvementIdeas,
    nextVideoIdeas: v.analysis.nextVideoIdeas,
  }))

  const prompt = `以下は${videos.length}本の動画の個別分析結果です。これらから共通パターンと次回作戦略を抽出してください。

${JSON.stringify(summaryJson, null, 2)}

必ず日本語のみで、次の形式のJSONオブジェクトだけを返してください（前後に説明文やマークダウンを付けない）：

{
  "videoSummaries": [
    { "url": "動画URL", "title": "動画タイトル", "keyFeature": "この動画の最大の特徴（1〜2文）" }
  ],
  "commonHookPatterns": ["共通フックパターン1", "共通フックパターン2", "共通フックパターン3"],
  "commonEmotionPatterns": ["共通感情設計1", "共通感情設計2", "共通感情設計3"],
  "commonStructure": "複数動画に共通する構成パターンの説明（3〜5文）",
  "commonCTAPatterns": ["共通CTA1", "共通CTA2", "共通CTA3"],
  "keySuccessFactors": ["成功要因1", "成功要因2", "成功要因3", "成功要因4", "成功要因5"],
  "nextVideoIdeas": ["次回作アイデア1", "次回作アイデア2", "次回作アイデア3", "次回作アイデア4"],
  "scriptPrompt": "次の動画台本を作るためのプロンプト（具体的に）",
  "videoPrompt": "映像生成AIプロンプト（英語段落）"
}

【ルール】
- videoSummaries は入力した動画の数だけ返す
- 各動画の個別分析データに根ざした具体的な内容にすること（抽象的な一般論禁止）
- commonHookPatterns / commonEmotionPatterns / commonCTAPatterns は必ず3件
- keySuccessFactors は必ず5件、nextVideoIdeas は必ず4件`

  let res: Response
  try {
    res = await fetchOpenAIChatCompletions(
      apiKey,
      {
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "あなたはYouTubeショート動画の構成分析に長けたマーケティングアナリストです。必ず日本語のみで、指定されたJSON形式のみを返してください。",
          },
          { role: "user", content: prompt },
        ],
      },
      { maxRetries: 3 }
    )
  } catch {
    return null
  }

  if (!res.ok) return null

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = completion.choices?.[0]?.message?.content
  if (!content) return null

  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { json = JSON.parse(match[0]) } catch { return null }
  }

  if (json == null || typeof json !== "object" || Array.isArray(json)) return null
  const r = json as Record<string, unknown>

  const getString = (v: unknown): string => (typeof v === "string" ? v : "")
  const getStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(getString).filter(Boolean) : []

  const summaries: MultiVideoSummary[] = Array.isArray(r.videoSummaries)
    ? r.videoSummaries
        .filter((s): s is Record<string, unknown> => s != null && typeof s === "object")
        .map((s) => ({
          url: getString(s.url),
          title: getString(s.title),
          keyFeature: getString(s.keyFeature),
        }))
    : []

  return {
    videoSummaries: summaries,
    commonHookPatterns: getStrArr(r.commonHookPatterns),
    commonEmotionPatterns: getStrArr(r.commonEmotionPatterns),
    commonStructure: getString(r.commonStructure),
    commonCTAPatterns: getStrArr(r.commonCTAPatterns),
    keySuccessFactors: getStrArr(r.keySuccessFactors),
    nextVideoIdeas: getStrArr(r.nextVideoIdeas),
    scriptPrompt: getString(r.scriptPrompt),
    videoPrompt: getString(r.videoPrompt),
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません。" }, { status: 500 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "urls は2〜5件の配列で指定してください" }, { status: 400 })
  }

  const { urls } = parsed.data
  const invalidUrls = urls.filter((u) => !detectPlatform(u))
  if (invalidUrls.length > 0) {
    return NextResponse.json({ error: `対応していないURLです: ${invalidUrls[0]}` }, { status: 400 })
  }

  // 認証チェック（Businessプラン必須）
  const authHeader = req.headers.get("authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

  if (!accessToken || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "BUSINESS_REQUIRED", message: "この機能はBusinessプランのみ利用できます。" },
      { status: 403 }
    )
  }

  let authUser = null
  try {
    const anon = createSupabaseAnon()
    const { data, error } = await anon.auth.getUser(accessToken)
    if (!error && data.user) authUser = data.user
  } catch { /* ignore */ }

  if (!authUser) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const supabaseGate = assertSupabaseForAnalyze()
  if (!supabaseGate.ok) {
    return NextResponse.json(supabaseGate.body, { status: supabaseGate.status })
  }
  const admin = createSupabaseAdmin()
  const usageProfile = await fetchUserUsageRow(admin, authUser.id, authUser.email ?? null)
  if (!usageProfile) {
    return NextResponse.json({ error: "USER_PROFILE_UNAVAILABLE" }, { status: 500 })
  }

  if (usageProfile.plan !== "business") {
    return NextResponse.json(
      { error: "BUSINESS_REQUIRED", message: "複数動画の共通点分析はBusinessプラン専用です。" },
      { status: 403 }
    )
  }

  if (!isAnalysisLimitDisabled()) {
    const limit = checkAnalysisLimit(usageProfile)
    if (!limit.ok) {
      return NextResponse.json({ error: "LIMIT_EXCEEDED", plan: limit.plan }, { status: 403 })
    }
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

  // 各動画を並列で個別分析
  const results = await Promise.all(
    urls.map((url) => analyzeSingleVideo(url, apiKey, model))
  )

  const validResults = results
    .map((r, i) => r ? { url: urls[i], title: r.title, analysis: r.analysis } : null)
    .filter((r): r is { url: string; title: string; analysis: ShortsAnalysis } => r !== null)

  if (validResults.length < 2) {
    return NextResponse.json({ error: "分析できた動画が2本未満でした。URLを確認してください。" }, { status: 502 })
  }

  // 共通パターン抽出
  const multiAnalysis = await extractCommonPatterns(validResults, apiKey, model)
  if (!multiAnalysis) {
    return NextResponse.json({ error: "共通パターンの抽出に失敗しました" }, { status: 502 })
  }

  try {
    await incrementUserAnalysisCounts(admin, authUser.id)
  } catch (e) {
    console.error("[analyze-multi] incrementUserAnalysisCounts failed", e)
  }

  return NextResponse.json({ analysis: multiAnalysis })
}
