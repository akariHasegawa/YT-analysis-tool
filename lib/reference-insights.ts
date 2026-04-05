import { z } from "zod"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"

export const IMPROVEMENT_TAGS = ["フック改善", "サムネ改善", "テンポ改善", "オチ改善"] as const
export type ImprovementTag = (typeof IMPROVEMENT_TAGS)[number]

export type SourceThumbnailInsight = {
  thumbnailUrl: string
  thumbnailScore: number
  thumbnailComment: string
  improvementIdeas: string[]
}

export type EnrichedImprovementRow = {
  tag: ImprovementTag
  line: string
}

export type ReferencePickContext = {
  sourceTitle: string
  sourceChannel: string
  transcriptExcerpt?: string
  sourceThumbnailUrl?: string
}

export type ReferenceInsightsPayload = {
  sourceThumbnail: SourceThumbnailInsight | null
  /** サムネ分析と同じVision呼び出しで付くタグ付き提案（サムネが無いときは空） */
  enrichedImprovements: EnrichedImprovementRow[]
}

const TRANSCRIPT_MAX_CHARS = 12_000

const sourceThumbnailSchema = z.object({
  thumbnailScore: z.number().int().min(1).max(5),
  thumbnailComment: z.string(),
  improvementIdeas: z.array(z.string().min(1)).min(2).max(5),
})

const thumbnailInsightSchema = z.object({
  sourceThumbnail: sourceThumbnailSchema,
  enrichedImprovements: z
    .array(
      z.object({
        tag: z.enum(IMPROVEMENT_TAGS),
        line: z.string().min(1),
      })
    )
    .min(2)
    .max(6),
})

function normalizeSourceThumbnailUrl(raw?: string): string | undefined {
  const t = raw?.trim()
  if (!t) return undefined
  try {
    const u = new URL(t)
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined
    return t
  } catch {
    return undefined
  }
}

function normalizeTag(raw: string): ImprovementTag | null {
  const t = raw.trim() as ImprovementTag
  return IMPROVEMENT_TAGS.includes(t) ? t : null
}

function defaultSourceThumbnailInsight(url: string): SourceThumbnailInsight {
  return {
    thumbnailUrl: url,
    thumbnailScore: 3,
    thumbnailComment:
      "自動評価を取得できなかったため簡易表示です。コントラスト・文字サイズ・主題の一発認識を確認してください。",
    improvementIdeas: [
      "メインコピーを1行に絞り、背景との明暗差を強める。",
      "顔・商品・主役となる被写体を大きく、中央〜やや上寄せで配置する。",
    ],
  }
}

function mergeSourceThumbnail(
  url: string,
  raw: z.infer<typeof sourceThumbnailSchema> | undefined
): SourceThumbnailInsight {
  if (!raw) return defaultSourceThumbnailInsight(url)
  const ideas = raw.improvementIdeas.map((s) => s.trim()).filter(Boolean)
  return {
    thumbnailUrl: url,
    thumbnailScore: raw.thumbnailScore,
    thumbnailComment: raw.thumbnailComment.trim() || defaultSourceThumbnailInsight(url).thumbnailComment,
    improvementIdeas: ideas.length >= 2 ? ideas : defaultSourceThumbnailInsight(url).improvementIdeas,
  }
}

function buildAnalysisSummary(analysis: ShortsAnalysis): string {
  return `フック: ${analysis.hook.value} / ${analysis.hook.description}
感情: ${analysis.emotion.value} / ${analysis.emotion.description}
構成: ${analysis.structure.value} / ${analysis.structure.description}
CTA: ${analysis.cta.value} / ${analysis.cta.description}`
}

function buildTranscriptBlock(pickContext?: ReferencePickContext): string {
  const txRaw = pickContext?.transcriptExcerpt?.trim() ?? ""
  if (txRaw.length === 0) return ""
  return `\n--- 字幕（抜粋。台本の流れ・オチの材料。URLから取得）---\n${txRaw.slice(0, TRANSCRIPT_MAX_CHARS)}\n`
}

function emptyPayload(): ReferenceInsightsPayload {
  return { sourceThumbnail: null, enrichedImprovements: [] }
}

function fallbackPayload(url: string): ReferenceInsightsPayload {
  return {
    sourceThumbnail: defaultSourceThumbnailInsight(url),
    enrichedImprovements: [
      { tag: "フック改善", line: "冒頭3秒で「結果か疑問」のどちらかをはっきり出す。" },
      { tag: "サムネ改善", line: "メインコピーを1行に絞り、背景との差を強める。" },
      { tag: "テンポ改善", line: "無音でも伝わるテロップ密度を意識する。" },
      { tag: "オチ改善", line: "最後に視聴者の感情が回収される一言を置く。" },
    ],
  }
}

export function formatSheetImprovementTags(rows: EnrichedImprovementRow[]): string {
  const uniq = [...new Set(rows.map((r) => r.tag))]
  return uniq.join(",")
}

export function formatSheetImprovementLines(rows: EnrichedImprovementRow[]): string {
  return rows.map((r) => `[${r.tag}] ${r.line}`).join("\n")
}

/** GAS / スプレッドシート AR 列向け。サムネが無いときは空文字。 */
export function formatSheetThumbnailImprovements(source: SourceThumbnailInsight | null): string {
  if (source == null || !source.improvementIdeas.length) return ""
  return source.improvementIdeas.map((line, i) => `${i + 1}. ${line}`).join("\n")
}

/**
 * 入力動画サムネの Vision 評価＋サムネ向け改善案＋タグ付き追加提案。
 * サムネURLが取れない場合は空を返す。
 */
export async function buildReferenceInsights(
  analysis: ShortsAnalysis,
  apiKey: string,
  model: string,
  pickContext?: ReferencePickContext
): Promise<ReferenceInsightsPayload> {
  const sourceThumbnailUrl = normalizeSourceThumbnailUrl(pickContext?.sourceThumbnailUrl)
  if (!sourceThumbnailUrl) {
    return emptyPayload()
  }

  const analysisSummary = buildAnalysisSummary(analysis)
  const sourceMeta =
    pickContext != null
      ? `元動画タイトル: ${pickContext.sourceTitle}\n元チャンネル名: ${pickContext.sourceChannel}\n`
      : ""
  const transcriptBlock = buildTranscriptBlock(pickContext)

  const userText = `以下は「ユーザーが分析したYouTube動画」の要約です。
---
${sourceMeta}
${analysisSummary}
${transcriptBlock}
---

添付の1枚は、その動画のサムネイル画像です（分析対象）。

タスク:
1) sourceThumbnail: サムネイルを見て thumbnailScore（1〜5、5が最強）、thumbnailComment（1〜2文の評価）、improvementIdeas を2〜5件（**サムネ・クリック率・視認性**の具体案、日本語）。
2) enrichedImprovements を2〜6件。tag は次のいずれかのみ: ${IMPROVEMENT_TAGS.join("、")}。動画全体の改善も含めよ。「サムネ改善」はサムネに直結する行を多めに。

必ず JSON のみ。1オブジェクト。キー: sourceThumbnail（thumbnailScore, thumbnailComment, improvementIdeas配列）、enrichedImprovements（tag と line）。`

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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: sourceThumbnailUrl, detail: "low" as const } },
            ],
          },
        ],
      }),
    })
  } catch {
    return fallbackPayload(sourceThumbnailUrl)
  }

  if (!res.ok) {
    return fallbackPayload(sourceThumbnailUrl)
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    return fallbackPayload(sourceThumbnailUrl)
  }

  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return fallbackPayload(sourceThumbnailUrl)
  }

  const parsed = thumbnailInsightSchema.safeParse(json)
  if (!parsed.success) {
    return fallbackPayload(sourceThumbnailUrl)
  }

  const enrichedImprovements: EnrichedImprovementRow[] = parsed.data.enrichedImprovements
    .map((r) => {
      const tag = normalizeTag(r.tag)
      if (!tag) return null
      return { tag, line: r.line.trim() }
    })
    .filter(Boolean) as EnrichedImprovementRow[]

  return {
    sourceThumbnail: mergeSourceThumbnail(sourceThumbnailUrl, parsed.data.sourceThumbnail),
    enrichedImprovements,
  }
}
