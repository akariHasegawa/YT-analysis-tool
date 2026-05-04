import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  idea: z.string().min(1),
  channelName: z.string().optional().default(""),
  platform: z.enum(["youtube", "tiktok", "instagram"]).optional().default("youtube"),
  hook: z.string().optional().default(""),
  emotion: z.string().optional().default(""),
  hashtags: z.string().optional().default(""),
})

const SYSTEM_PROMPT = `あなたはSNS投稿文の専門家です。
動画アイデアとコンテキストをもとに、以下のJSONキーをすべて埋めて返してください。

{
  "caption": "投稿文本文（150〜300文字。冒頭に引きの一文、中盤に内容紹介、末尾にCTAを入れる。改行を活用して読みやすく）",
  "hashtags": "ハッシュタグ（スペース区切りで10〜15個。バズりやすいものと関連性の高いものをバランスよく混ぜる）",
  "shortCaption": "短い投稿文（50〜80文字。TikTokのキャプション欄など短い場合向け）"
}

ルール：
- プラットフォームに合わせたトーン（TikTok/Reels→テンポよくカジュアル、YouTube→少し丁寧）
- ハッシュタグは日本語・英語を混ぜる
- 「いいね」「保存」「フォロー」などのCTAを自然に入れる
- JSONのみ返す`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません" }, { status: 500 })
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

  const { idea, channelName, platform, hook, emotion, hashtags } = parsed.data
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

  const userContent = `【動画アイデア】
${idea}
${channelName ? `チャンネル名: ${channelName}` : ""}
プラットフォーム: ${platform === "youtube" ? "YouTube" : platform === "tiktok" ? "TikTok" : "Instagram"}
${hook ? `フックパターン: ${hook}` : ""}
${emotion ? `感情設計・トーン: ${emotion}` : ""}
${hashtags ? `参考ハッシュタグ（分析動画より）: ${hashtags}` : ""}`

  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "OpenAI接続失敗" }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: `OpenAI API エラー: ${res.status}` }, { status: 502 })
  }

  const completion = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
  const raw = completion.choices?.[0]?.message?.content
  if (!raw) return NextResponse.json({ error: "AIからの応答が空でした" }, { status: 502 })

  let fields: Record<string, string> = {}
  try {
    fields = JSON.parse(raw) as Record<string, string>
  } catch {
    return NextResponse.json({ error: "AI出力のパースに失敗しました" }, { status: 502 })
  }

  return NextResponse.json({
    caption: fields.caption ?? "",
    hashtags: fields.hashtags ?? "",
    shortCaption: fields.shortCaption ?? "",
  })
}
