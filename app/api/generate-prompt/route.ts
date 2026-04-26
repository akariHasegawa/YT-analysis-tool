import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const competitorComparisonContextSchema = z
  .object({
    competitorStrengths: z.array(z.string()).optional(),
    yourWeaknesses: z.array(z.string()).optional(),
    priorityImprovements: z.array(z.string()).optional(),
  })
  .optional()

const bodySchema = z.object({
  idea: z.string().min(1),
  promptType: z.enum(["script", "video-short", "video-long"]),
  castCount: z.enum(["1", "2", "3+"]).optional().default("1"),
  dialogueStyle: z.string().optional().default(""),
  context: z.object({
    channelName: z.string(),
    subjectType: z.string().optional(),
    actionType: z.string().optional(),
    improvementIdeas: z.array(z.string()).optional(),
    hook: z.string().optional(),
    emotion: z.string().optional(),
    competitorComparison: competitorComparisonContextSchema,
    multiContext: z.object({
      commonStructure: z.string().optional(),
      commonCTAPatterns: z.array(z.string()).optional(),
      keySuccessFactors: z.array(z.string()).optional(),
    }).optional(),
  }),
})

// AIにJSONで各フィールドを返させるシステムプロンプト
const SCRIPT_FIELDS_PROMPT = `あなたはYouTubeショート動画の企画専門家です。
動画アイデアとコンテキストをもとに、以下のJSONキーをすべて埋めて返してください。

{
  "target": "ターゲット視聴者（年齢・属性・悩みを具体的に1〜2文）",
  "hook": "冒頭0〜3秒の具体的な一言・数字・問いかけ。セリフ形式で書くこと（例：「手取り18万で毎月3万貯めてる」という一言から始める）",
  "scene1": "本編 展開1（何を・どう見せるか具体的に）",
  "scene2": "本編 展開2（具体的に）",
  "scene3": "本編 展開3（具体的に）",
  "cta": "締め・CTAの呼びかけ文（コメント・保存・フォローなど）",
  "tone": "話し方・テンポ・口調（具体的に）"
}

禁止：「視聴者が共感できる」「感情に訴える」などの抽象表現のみで終わること。
JSONのみ返す。`

function buildVideoSystemPrompt(format: "short" | "long"): string {
  const constraints = format === "short"
    ? `【制約】縦型ショート動画（60秒以内・TikTok/Reels/YouTube Shorts）向け。Timelineは60秒以内で構成すること。Constraintsには「60秒以内」を必ず含めること。`
    : `【制約】横型通常動画（5〜15分・YouTube）向け。Timelineは5〜15分で構成すること。Constraintsには動画の総尺を必ず含めること。`

  return `あなたはSeedance・Sora等の動画生成AIに渡す構造化プロンプトの専門家です。
渡された「次に作るべき動画アイデア」と「分析コンテキスト」をもとに、
以下の2部構成で出力してください。

${constraints}

【Part 1: 構造化プロンプト】
必ず以下の全項目を埋めること（各項目1〜3文で具体的に）：

• 【Subject｜主題】
• 【Setting｜環境】
• 【Action｜動作】
• 【Emotion｜演出（感情）】
• 【Camera｜カメラ】
• 【Style｜映像スタイル】
• 【Audio｜音声】
• 【Timeline｜時間構成】
• 【Constraints｜制約条件】
• 【Lighting｜照明・光の演出】
• 【Props｜小道具・周辺オブジェクト】
• 【Character Design｜キャラデザイン】
• 【Transitions｜場面転換】
• 【Tone / Mood｜全体の雰囲気】

---

【Part 2: 自然言語まとめ（英語）】
上記の構造化プロンプトを、Sora・Runwayなどに直接貼り付けられる自然な英語の段落文章（150〜200文字）にまとめてください。

前置きや説明は不要。Part 1の箇条書き → 区切り線 → Part 2の英語文章、の順で出力すること。`
}

// AIが返したJSONからテンプレートを組み立てる
function buildScriptPrompt(
  idea: string,
  fields: Record<string, string>,
  castCount: string,
  dialogueStyle: string
): string {
  const castFormats: Record<string, string> = {
    "1": "1人（ナレーション形式）",
    "2": "2人（A・Bの対話形式）",
    "3+": "3人以上（複数人の対話形式）",
  }
  const castNote: Record<string, string> = {
    "1": "語り手1人のナレーション。セリフは「」で囲む。",
    "2": "2人の対話。各セリフをA：B：で区別する。",
    "3+": "複数人の対話。各キャラのセリフを名前またはA・B・Cで区別する。",
  }

  return `以下の条件でYouTubeショート動画（60秒以内）の台本を書いてください。

【テーマ】
${idea}

【ターゲット視聴者】
${fields.target ?? ""}

【登場人数・形式】
${castFormats[castCount] ?? castFormats["1"]}${dialogueStyle ? `　スタイル：${dialogueStyle}` : ""}

【冒頭フック（0〜3秒）】
${fields.hook ?? ""}

【本編構成（4〜50秒）】
- 展開1：${fields.scene1 ?? ""}
- 展開2：${fields.scene2 ?? ""}
- 展開3：${fields.scene3 ?? ""}

【締め・CTA（51〜60秒）】
${fields.cta ?? ""}

【トーン・話し方】
${fields.tone ?? ""}

【台本形式】
${castNote[castCount] ?? castNote["1"]}ナレーション指示は（）で記載する。

上記の条件をすべて満たした台本を書いてください。`
}

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

  const { idea, promptType, castCount, dialogueStyle, context } = parsed.data
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

  const mc = context.multiContext
  let userContent = `動画アイデア: ${idea}
${context.channelName ? `チャンネル名: ${context.channelName}` : ""}
${context.hook ? `共通フックパターン: ${context.hook}` : ""}
${context.emotion ? `共通感情設計: ${context.emotion}` : ""}
${mc?.commonStructure ? `共通構成パターン: ${mc.commonStructure}` : ""}
${mc?.commonCTAPatterns?.length ? `共通CTA: ${mc.commonCTAPatterns.join(" / ")}` : ""}
${mc?.keySuccessFactors?.length ? `成功要因:\n${mc.keySuccessFactors.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}
${context.improvementIdeas?.length ? `参考ポイント:\n${context.improvementIdeas.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}
${context.subjectType ? `被写体タイプ: ${context.subjectType}` : ""}
${context.actionType ? `映像アクション: ${context.actionType}` : ""}`

  const cc = context.competitorComparison
  if (cc) {
    const weaknesses = (cc.yourWeaknesses ?? []).filter(Boolean)
    const strengths = (cc.competitorStrengths ?? []).filter(Boolean)
    if (promptType === "script" && weaknesses.length > 0) {
      userContent += `\n競合分析で判明した不足要素:\n${weaknesses.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    }
    if (promptType !== "script" && strengths.length > 0) {
      userContent += `\n競合動画で効果的だった要素:\n${strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    }
  }

  // script: JSONでフィールドを取得 → コードでテンプレート組み立て
  if (promptType === "script") {
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
            { role: "system", content: SCRIPT_FIELDS_PROMPT },
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

    const prompt = buildScriptPrompt(idea, fields, castCount, dialogueStyle ?? "")
    return NextResponse.json({ prompt })
  }

  // video-short / video-long: フリーテキスト生成
  const videoSystemPrompt = buildVideoSystemPrompt(promptType === "video-short" ? "short" : "long")
  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: videoSystemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "OpenAI接続失敗" }, { status: 502 })
  }

  if (!res.ok) {
    const errText = await res.text()
    return NextResponse.json({ error: `OpenAI API エラー: ${res.status}`, detail: errText.slice(0, 500) }, { status: 502 })
  }

  const completion = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
  const content = completion.choices?.[0]?.message?.content
  if (!content) return NextResponse.json({ error: "AIからの応答が空でした" }, { status: 502 })

  return NextResponse.json({ prompt: content })
}
