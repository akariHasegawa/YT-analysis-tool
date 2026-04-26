import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { extractYouTubeVideoId, isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { fetchYouTubeTranscriptLines } from "@/lib/youtube-transcript-lines"
import {
  assertSupabaseForAnalyze,
  checkAnalysisLimit,
  fetchUserUsageRow,
  incrementUserAnalysisCounts,
  isAnalysisLimitDisabled,
} from "@/lib/analysis-usage"
import { fetchOpenAIChatCompletions } from "@/lib/openai-chat"
import { createSupabaseAdmin, createSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase"
import type { MultiVideoAnalysis, MultiVideoSummary } from "@/lib/multi-video-analysis"

const bodySchema = z.object({
  urls: z.array(z.string().min(1)).min(2).max(5),
})

async function fetchVideoTitle(url: string): Promise<string> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return url
    const data = (await res.json()) as { title?: string }
    return typeof data.title === "string" && data.title ? data.title : url
  } catch {
    return url
  }
}

function buildMultiAnalysisPrompt(
  videos: Array<{ url: string; title: string; transcript: string }>
): string {
  const videoBlocks = videos
    .map(
      (v, i) => `
【動画${i + 1}】
タイトル: ${v.title}
URL: ${v.url}
${v.transcript ? `字幕:\n${v.transcript.slice(0, 6000)}` : "（字幕取得不可）"}
`.trim()
    )
    .join("\n\n")

  return `以下の${videos.length}本の動画を分析し、共通パターンと成功要因を抽出してください。

${videoBlocks}

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
  "scriptPrompt": "以下の条件でYouTubeショート動画（60秒以内）の台本を書いてください。\n\n【テーマ】\n（これらの動画の共通テーマを1〜2文で具体的に記述）\n\n【ターゲット視聴者】\n（年齢・属性・悩みを具体的に）\n\n【冒頭フック（0〜3秒）】\n（これらの動画に共通するフック手法を使った具体的な一言・数字・問いかけ）\n\n【本編構成（4〜50秒）】\n- 展開1：（共通パターンに基づく具体的な内容）\n- 展開2：（具体的な内容）\n- 展開3：（具体的な内容）\n\n【締め・CTA（51〜60秒）】\n（共通CTAパターンに基づく具体的な呼びかけ文）\n\n【トーン・話し方】\n（これらの動画のトーンに基づく具体的な指示）\n\n上記の条件をすべて満たした台本を書いてください。セリフは「」で囲み、ナレーション指示は（）で記載してください。",
  "videoPrompt": "同じパターンで動画を作るための映像生成AIプロンプト。以下の2部構成で出力すること。\n【Part 1: 構造化】• 【Subject｜主題】• 【Setting｜環境】• 【Action｜動作】• 【Emotion｜演出（感情）】• 【Camera｜カメラ】• 【Style｜映像スタイル】• 【Audio｜音声】• 【Timeline｜時間構成】• 【Constraints｜制約条件】• 【Lighting｜照明・光の演出】• 【Props｜小道具・周辺オブジェクト】• 【Character Design｜キャラデザイン】• 【Transitions｜場面転換】• 【Tone / Mood｜全体の雰囲気】\n---\n【Part 2: 自然言語まとめ（英語）】Sora・Runwayに貼れる英語の段落文章（150〜200文字）"
}

【ルール】
- videoSummaries は入力した動画の数だけ返す
- commonHookPatterns / commonEmotionPatterns / commonCTAPatterns は必ず3件
- keySuccessFactors は必ず5件
- nextVideoIdeas は必ず4件
- 抽象的な一般論ではなく、これらの動画の字幕やタイトルに根ざした具体的な内容にすること`
}

function parseMultiAnalysis(content: string): MultiVideoAnalysis | null {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      json = JSON.parse(match[0])
    } catch {
      return null
    }
  }

  if (json == null || typeof json !== "object" || Array.isArray(json)) return null
  const r = json as Record<string, unknown>

  const getString = (v: unknown): string => (typeof v === "string" ? v : "")
  const getStrArr = (v: unknown, fallback: string[] = []): string[] =>
    Array.isArray(v) ? v.map(getString).filter(Boolean) : fallback

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
  const invalidUrls = urls.filter((u) => !isLikelyYouTubeUrl(u))
  if (invalidUrls.length > 0) {
    return NextResponse.json(
      { error: `YouTube のURLではない可能性があります: ${invalidUrls[0]}` },
      { status: 400 }
    )
  }

  // Auth: Business plan required
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
  } catch {
    /* ignore */
  }

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

  // Fetch titles + transcripts in parallel
  const videoDataList = await Promise.all(
    urls.map(async (url) => {
      const [title, transcript] = await Promise.all([
        fetchVideoTitle(url),
        (async () => {
          const vid = extractYouTubeVideoId(url)
          if (!vid) return ""
          try {
            const t = await fetchYouTubeTranscriptLines(vid, { durationHintSec: null })
            return t?.trim() ?? ""
          } catch {
            return ""
          }
        })(),
      ])
      return { url, title, transcript }
    })
  )

  const systemPrompt = `あなたはYouTubeショート動画の構成分析に長けたマーケティングアナリストです。
複数の動画の共通パターンを分析して、次の動画制作に活かせる知見を抽出します。
必ず日本語のみで、指定されたJSON形式のみを返してください。`

  const userContent = buildMultiAnalysisPrompt(videoDataList)

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  let res: Response
  try {
    res = await fetchOpenAIChatCompletions(
      apiKey,
      {
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      },
      { maxRetries: 3 }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI への接続に失敗しました"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json(
      { error: `OpenAI API エラー: ${res.status}`, detail: errText.slice(0, 300) },
      { status: 502 }
    )
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    return NextResponse.json({ error: "AIからの応答が空でした" }, { status: 502 })
  }

  const analysis = parseMultiAnalysis(content)
  if (!analysis) {
    return NextResponse.json({ error: "AIの出力形式が不正です" }, { status: 502 })
  }

  try {
    await incrementUserAnalysisCounts(admin, authUser.id)
  } catch (e) {
    console.error("[analyze-multi] incrementUserAnalysisCounts failed", e)
  }

  return NextResponse.json({ analysis })
}
