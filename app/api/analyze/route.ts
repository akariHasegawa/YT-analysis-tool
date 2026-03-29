import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  finalizeShortsAnalysisFromAi,
  normalizeShortsAnalysis,
  shortsAnalysisAiSchema,
} from "@/lib/shorts-analysis"
import { extractYouTubeVideoId, isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { fetchYouTubeTranscriptLines } from "@/lib/youtube-transcript-lines"
import {
  emptyStructureTimelineFields,
  inferStructureTimelineFromTranscript,
} from "@/lib/structure-timeline"

function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes("tiktok.com")) return "tiktok"
  if (u.includes("instagram.com") && (u.includes("/reels") || u.includes("reels"))) return "instagram_reels"
  if (u.includes("youtube.com") && u.includes("/shorts")) return "youtube_shorts"
  if (u.includes("youtu.be") && u.includes("/")) return "youtube_shorts"
  return "unknown"
}

/** GAS 保存用: 長さではなく URL に `/shorts/` が含まれるかで判定 */
function detectVideoType(url: string): "shorts" | "long" {
  return url.toLowerCase().includes("/shorts/") ? "shorts" : "long"
}

function mergeCookiesFromResponse(cookieJar: string, res: Response): string {
  const h = res.headers as Headers & { getSetCookie?: () => string[] }
  const list = typeof h.getSetCookie === "function" ? h.getSetCookie() : []
  if (list.length === 0) return cookieJar

  const map = new Map<string, string>()
  for (const part of cookieJar.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf("=")
    if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1))
  }
  for (const line of list) {
    const nv = line.split(";")[0]?.trim()
    if (!nv || !nv.includes("=")) continue
    const eq = nv.indexOf("=")
    map.set(nv.slice(0, eq), nv.slice(eq + 1))
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
}

/**
 * script.google.com の Web アプリは 302 で script.googleusercontent.com 等へ飛ばす。
 * リダイレクト応答の Set-Cookie を次の POST に付けないと、405 や「ページが見つかりません」になることがある。
 */
async function postToGoogleAppsScriptWebhook(
  execUrl: string,
  jsonBody: string,
  signal: AbortSignal
): Promise<Response> {
  const attempts: Array<{ label: string; headers: Record<string, string>; body: string }> = [
    {
      label: "json",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: jsonBody,
    },
    {
      label: "textPlain",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: jsonBody,
    },
    {
      label: "formData",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: new URLSearchParams({ data: jsonBody }).toString(),
    },
  ]

  const browserHeaders = {
    Accept: "*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://script.google.com/",
  }

  // 307/308 なら follow で POST が維持される環境向け
  try {
    const fr = await fetch(execUrl, {
      method: "POST",
      headers: { ...browserHeaders, "Content-Type": "application/json; charset=utf-8" },
      body: jsonBody,
      redirect: "follow",
      signal,
    })
    const txt = await fr.text()
    const bad = txt.includes("ページが見つかりません") || txt.includes("Script function not found")
    const finalUrl = typeof (fr as { url?: string }).url === "string" ? (fr as { url: string }).url : ""
    console.log("[GAS webhook] redirect:follow", fr.status, finalUrl.slice(0, 120), txt.slice(0, 80))
    if (fr.ok && !bad) {
      return new Response(txt, { status: fr.status, headers: fr.headers })
    }
  } catch (e) {
    console.error("[GAS webhook] redirect:follow error", e)
  }

  let last: Response | null = null

  for (const attempt of attempts) {
    let currentUrl = execUrl
    let cookieJar = ""
    for (let hop = 0; hop < 8; hop++) {
      const reqHeaders: Record<string, string> = { ...browserHeaders, ...attempt.headers }
      if (cookieJar) reqHeaders.Cookie = cookieJar

      const res = await fetch(currentUrl, {
        method: "POST",
        headers: reqHeaders,
        body: attempt.body,
        signal,
        redirect: "manual",
      })
      last = res
      cookieJar = mergeCookiesFromResponse(cookieJar, res)

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location")
        if (!loc) {
          console.error("GAS webhook redirect without Location", attempt.label, hop, res.status)
          break
        }
        const nextUrl = new URL(loc, currentUrl).href
        console.log("[GAS webhook] redirect", attempt.label, hop, res.status, "->", nextUrl.slice(0, 140))
        currentUrl = nextUrl
        continue
      }

      if (res.ok) {
        return res
      }

      const peek = await res.clone().text()
      console.error("GAS webhook attempt failed", attempt.label, hop, res.status, peek.slice(0, 200))
      break
    }
  }

  return last ?? new Response("GAS webhook: no response", { status: 599 })
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
  "retentionDimensions": {
    "hookStrength": 1,
    "tempo": 1,
    "structureClarity": 1,
    "emotionalArc": 1,
    "payoffStrength": 1,
    "ctaNaturalness": 1
  },
  "retentionReasons": ["短い理由1（20〜45文字程度）", "短い理由2（20〜45文字程度）"]
}

retentionDimensions の各キーは整数1〜5のみ。意味は次のとおり:
- hookStrength: 冒頭フックの強さ
- tempo: テンポの良さ
- structureClarity: 構成のわかりやすさ
- emotionalArc: 感情変化の有無・効き
- payoffStrength: オチ・回収の強さ
- ctaNaturalness: CTAの自然さ

分析内容に応じて差をつけ、6軸すべて同じ整数（例: 全部4）にしないこと。
弱みや不確かな点は1〜2、明確な強みは4〜5とし、タイトル・チャンネル文脈と矛盾しない採点にすること。
retentionReasons は必ず2件。視聴維持率の見立ての根拠がわかる短文にすること（パーセント数値は書かないこと。システム側で算出する）。

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

  const analysisResult = shortsAnalysisAiSchema.safeParse(analysisJson)
  if (!analysisResult.success) {
    return NextResponse.json(
      { error: "AIの出力形式が不正です", issues: analysisResult.error.flatten() },
      { status: 502 }
    )
  }

  const analysis = normalizeShortsAnalysis(finalizeShortsAnalysisFromAi(analysisResult.data))

  /** スプレッドシート保存用のみ。字幕→AI。失敗時は空文字のまま。 */
  let timelineForSheet = emptyStructureTimelineFields()
  try {
    const vid = extractYouTubeVideoId(url)
    if (vid) {
      const transcript = await fetchYouTubeTranscriptLines(vid)
      if (transcript?.trim()) {
        timelineForSheet = await inferStructureTimelineFromTranscript({
          apiKey,
          model,
          transcript,
          title,
          channelName,
          durationSec: duration ?? null,
        })
      }
    }
  } catch {
    timelineForSheet = emptyStructureTimelineFields()
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim()
  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl)
      console.log("[GAS webhook] 送信先 pathname:", u.pathname)
    } catch {
      console.error("[GAS] GOOGLE_SHEETS_WEBHOOK_URL が有効な URL ではありません")
    }
    const analyzedAt = new Date().toISOString()
    const durationSec = duration ?? null
    const videoType = detectVideoType(url)
    /** スプレッドシート E/F 列用（URL の /shorts/ 判定。GAS の appendRow 列順に合わせて配置） */
    const sheetColE_shorts = videoType === "shorts" ? "ショート動画" : ""
    const sheetColF_regular = videoType === "long" ? "通常動画" : ""

    const payload = {
      analyzedAt,
      platform: detectPlatform(url),
      videoType,
      /** 別名: シート E 列向け */
      sheetColE_shorts,
      /** 別名: シート F 列向け */
      sheetColF_regular,
      url,
      title,
      channelName,
      publishedAt: publishedAt ?? null,
      viewCount: viewCount ?? null,
      duration: durationSec,
      durationSec,
      thumbnailUrl: thumbnailUrl ?? null,
      hookType: analysis.hook.value,
      emotionType: analysis.emotion.value,
      ctaType: analysis.cta.value,
      structureType: analysis.structure.value,
      endingType: null,
      retentionPrediction: analysis.retention.value,
      retentionScore: analysis.retentionScore,
      retentionLabel: analysis.retentionLabel,
      retentionReasons: analysis.retentionReasons,
      improvementIdeas: analysis.improvementIdeas,
      nextVideoIdeas: analysis.nextVideoIdeas,
      ...timelineForSheet,
    }

    const ac = new AbortController()
    const timeoutId = setTimeout(() => ac.abort(), 20000)
    try {
      const jsonBody = JSON.stringify(payload)
      const webhookRes = await postToGoogleAppsScriptWebhook(webhookUrl, jsonBody, ac.signal)
      const bodyText = await webhookRes.text()
      if (!webhookRes.ok) {
        console.error("GAS webhook non-2xx", webhookRes.status, bodyText.slice(0, 400))
      } else {
        console.log("GAS webhook", webhookRes.status, bodyText.slice(0, 200))
      }
    } catch (e) {
      console.error("GAS webhook POST failed", e)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return NextResponse.json({ analysis })
}
