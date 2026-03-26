import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { normalizeShortsAnalysis, shortsAnalysisSchema } from "@/lib/shorts-analysis"
import { isLikelyYouTubeUrl } from "@/lib/youtube-video-id"

function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes("tiktok.com")) return "tiktok"
  if (u.includes("instagram.com") && (u.includes("/reels") || u.includes("reels"))) return "instagram_reels"
  if (u.includes("youtube.com") && u.includes("/shorts")) return "youtube_shorts"
  if (u.includes("youtu.be") && u.includes("/")) return "youtube_shorts"
  return "unknown"
}

const bodySchema = z.object({
  url: z.string().min(1),
  title: z.string(),
  channelName: z.string(),
  publishedAt: z.string().nullable().optional(),
  viewCount: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
})

const SYSTEM_PROMPT = `あなたはYouTubeショート動画の構成分析に長けたマーケティングアナリストです。
ユーザーから渡されるのは「動画URL」「タイトル」「チャンネル名」のみです。実際の映像は見られません。
タイトルとチャンネル名から、ショート動画としてありがちなパターンを推論し、具体的に分析してください。

必ず日本語のみで出力すること。
次のJSONスキーマに完全一致する1つのJSONオブジェクトだけを返すこと（前後に説明文やマークダウンを付けない）。

{
  "hook": { "value": "短いラベル（例: 質問型フック）", "description": "1〜3文の説明" },
  "emotion": { "value": "短いラベル", "description": "1〜3文の説明" },
  "cta": { "value": "短いラベル", "description": "1〜3文の説明" },
  "structure": { "value": "短いラベル", "description": "1〜3文の説明" },
  "retention": { "value": "視聴維持率の評価を短く（例: 推定65% — やや高め）", "description": "根拠を1〜3文で" },
  "improvementIdeas": ["改善案1", "改善案2", "改善案3", "改善案4", "改善案5"],
  "nextVideoIdeas": ["次の動画アイデア1", "アイデア2", "アイデア3", "アイデア4"]
}

improvementIdeas は必ず5件、nextVideoIdeas は必ず4件にすること。`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません。.env.local に設定してください。" },
      { status: 500 }
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { url, title, channelName, publishedAt, viewCount, duration, thumbnailUrl } = parsed.data
  if (!isLikelyYouTubeUrl(url)) {
    return NextResponse.json({ error: "YouTube のURLではない可能性があります" }, { status: 400 })
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const userContent = `動画URL: ${url}
動画タイトル: ${title}
チャンネル名: ${channelName}

上記をもとにショート動画として分析し、指定スキーマのJSONのみを返してください。`

  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI への接続に失敗しました"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json(
      { error: `OpenAI API エラー: ${res.status}`, detail: errText.slice(0, 500) },
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

  let analysisJson: unknown
  try {
    analysisJson = JSON.parse(content)
  } catch {
    return NextResponse.json({ error: "AIの応答をJSONとして解釈できませんでした" }, { status: 502 })
  }

  const analysisResult = shortsAnalysisSchema.safeParse(analysisJson)
  if (!analysisResult.success) {
    return NextResponse.json(
      { error: "AIの出力形式が不正です", issues: analysisResult.error.flatten() },
      { status: 502 }
    )
  }

  const analysis = normalizeShortsAnalysis(analysisResult.data)
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (webhookUrl) {
    const analyzedAt = new Date().toISOString()
    const payload = {
      analyzedAt,
      platform: detectPlatform(url),
      url,
      title,
      channelName,
      publishedAt: publishedAt ?? null,
      viewCount: viewCount ?? null,
      duration: duration ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      hookType: analysis.hook.value,
      emotionType: analysis.emotion.value,
      ctaType: analysis.cta.value,
      structureType: analysis.structure.value,
      endingType: null,
      retentionPrediction: analysis.retention.value,
      improvementIdeas: analysis.improvementIdeas,
      nextVideoIdeas: analysis.nextVideoIdeas,
    }

    const ac = new AbortController()
    const timeoutId = setTimeout(() => ac.abort(), 15000)
    try {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      })
      if (!webhookRes.ok) {
        const errText = await webhookRes.text()
        console.error("GAS webhook returned non-2xx", webhookRes.status, errText.slice(0, 300))
      }
    } catch (e) {
      console.error("GAS webhook POST failed", e)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return NextResponse.json({ analysis })
}
