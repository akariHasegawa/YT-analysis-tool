import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  idea: z.string().min(1),
  promptType: z.enum(["script", "video"]),
  context: z.object({
    channelName: z.string(),
    subjectType: z.string().optional(),
    actionType: z.string().optional(),
    improvementIdeas: z.array(z.string()).optional(),
    hook: z.string().optional(),
    emotion: z.string().optional(),
  }),
})

const SCRIPT_SYSTEM_PROMPT = `あなたはYouTubeショート動画の台本生成プロンプトの専門家です。
渡された「次に作るべき動画アイデア」と「分析コンテキスト」をもとに、
ChatGPTやClaudeに渡してそのまま台本を生成できる高品質なプロンプトを日本語で作成してください。

プロンプトには以下を含めること：
- 動画のテーマ・タイトル案
- ターゲット視聴者
- 冒頭フック（最初の3秒）の具体的な指示
- 本編の構成（起承転結）
- 締め・CTA
- トーン・話し方のスタイル
- 尺（60秒以内のショート）

出力はそのままChatGPT/Claudeに貼り付けられるプロンプト文章のみを返すこと。
前置きや説明は不要。`

const VIDEO_SYSTEM_PROMPT = `あなたはSeedance・Sora等の動画生成AIに渡す構造化プロンプトの専門家です。
渡された「次に作るべき動画アイデア」と「分析コンテキスト」をもとに、
以下のフォーマットで日本語の構造化プロンプトを生成してください。

必ず以下の全項目を埋めること：

【Subject｜主題】
【Setting｜環境】
【Action｜動作】
【Emotion｜演出（感情）】
【Camera｜カメラ】
【Style｜映像スタイル】
【Audio｜音声】
【Timeline｜時間構成】
【Constraints｜制約条件】
【Lighting｜照明・光の演出】
【Props｜小道具・周辺オブジェクト】
【Character Design｜キャラデザイン】
【Transitions｜場面転換】
【Tone / Mood｜全体の雰囲気】

各項目は1〜3文で具体的に記述すること。
出力は上記フォーマットの構造化プロンプトのみを返すこと。前置きや説明は不要。`

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

  const { idea, promptType, context } = parsed.data
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

  const userContent = `動画アイデア: ${idea}

チャンネル名: ${context.channelName}
${context.hook ? `フック手法: ${context.hook}` : ""}
${context.emotion ? `感情訴求: ${context.emotion}` : ""}
${context.subjectType ? `被写体タイプ: ${context.subjectType}` : ""}
${context.actionType ? `映像アクション: ${context.actionType}` : ""}
${context.improvementIdeas?.length ? `元動画の改善点:\n${context.improvementIdeas.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}

上記を踏まえて${promptType === "script" ? "台本生成プロンプト" : "動画生成プロンプト"}を作成してください。`

  const systemPrompt = promptType === "script" ? SCRIPT_SYSTEM_PROMPT : VIDEO_SYSTEM_PROMPT

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
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
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

  return NextResponse.json({ prompt: content })
}
