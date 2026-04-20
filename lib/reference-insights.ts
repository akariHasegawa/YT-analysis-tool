import { z } from "zod"

function toMinSec(sec: number): string {
  return `${Math.floor(sec / 60)}分${Math.round(sec % 60)}秒`
}

function convertSecondsInText(text: string): string {
  // 「100.87s-104.40s」または「[100.87s-104.40s]」→「1分40秒-1分44秒」
  let result = text.replace(
    /\[?(\d+(?:\.\d+)?)\s*s\s*[-–~〜]\s*(\d+(?:\.\d+)?)\s*s\]?/g,
    (_, a: string, b: string) => `${toMinSec(parseFloat(a))}-${toMinSec(parseFloat(b))}`
  )
  // 「9.52s」単体→「0分9秒」
  result = result.replace(/(\d+(?:\.\d+)?)\s*s(?=[^\w]|$)/g, (_, n: string) => toMinSec(parseFloat(n)))
  // 「27.80秒」→「0分27秒」（※「1分12秒」の12秒は変換しない）
  result = result.replace(/(?<!分)(\d+(?:\.\d+)?)秒/g, (_, n: string) => toMinSec(parseFloat(n)))
  return result
}

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
  enrichedImprovements: EnrichedImprovementRow[]
}

const sourceThumbnailSchema = z.object({
  thumbnailScore: z.number().int().min(1).max(5),
  thumbnailComment: z.string(),
  improvementIdeas: z.array(z.string().min(1)).min(2).max(5),
})

const unifiedReferenceInsightsSchema = z.object({
  sourceThumbnail: sourceThumbnailSchema.nullish(),
  enrichedImprovements: z
    .array(
      z.object({
        tag: z.string(),
        line: z.string().min(1),
      })
    )
    .optional(),
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

export function formatSheetThumbnailImprovements(source: SourceThumbnailInsight | null): string {
  if (source == null || !source.improvementIdeas.length) return ""
  return source.improvementIdeas.map((line, i) => `${i + 1}. ${line}`).join("\n")
}

/** メイン分析レスポンス内の referenceInsights ブロックをパースする（単体 OpenAI 呼び出しは行わない） */
export function parseReferenceInsightsFromPartial(
  json: unknown,
  sourceThumbnailUrl: string | undefined
): ReferenceInsightsPayload {
  const url = normalizeSourceThumbnailUrl(sourceThumbnailUrl)
  if (!url) return emptyPayload()
  if (json == null || typeof json !== "object" || Array.isArray(json)) {
    return fallbackPayload(url)
  }
  const parsed = unifiedReferenceInsightsSchema.safeParse(json)
  if (!parsed.success) {
    return fallbackPayload(url)
  }

  const sourceThumbnail = mergeSourceThumbnail(url, parsed.data.sourceThumbnail ?? undefined)

  const rawRows = parsed.data.enrichedImprovements ?? []
  const enrichedImprovements: EnrichedImprovementRow[] = rawRows
    .map((r) => {
      const tag = normalizeTag(r.tag)
      if (!tag) return null
      return { tag, line: convertSecondsInText(r.line.trim()) }
    })
    .filter(Boolean) as EnrichedImprovementRow[]

  if (enrichedImprovements.length < 2) {
    return {
      sourceThumbnail,
      enrichedImprovements: fallbackPayload(url).enrichedImprovements,
    }
  }
  return { sourceThumbnail, enrichedImprovements }
}