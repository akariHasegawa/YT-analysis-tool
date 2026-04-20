import { z } from "zod"
import { computeRetentionPrediction } from "@/lib/retention-prediction"

export const retentionDimensionsSchema = z.object({
  hookStrength: z.coerce.number(),
  tempo: z.coerce.number(),
  structureClarity: z.coerce.number(),
  emotionalArc: z.coerce.number(),
  payoffStrength: z.coerce.number(),
  ctaNaturalness: z.coerce.number(),
})

const DEFAULT_RETENTION_DIMENSIONS = {
  hookStrength: 3,
  tempo: 3,
  structureClarity: 3,
  emotionalArc: 3,
  payoffStrength: 3,
  ctaNaturalness: 3,
} as const

function coerceNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * モデルがキー欠落・旧 retention 形式・型ゆれで返す場合に正規化してから zod 検証する。
 */
export function coerceAnalysisAiJson(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return raw
  }
  const o = { ...(raw as Record<string, unknown>) }

  const block = (key: string) => {
    const v = o[key]
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      return { value: "", description: "" }
    }
    const b = v as Record<string, unknown>
    return {
      value: typeof b.value === "string" ? b.value : String(b.value ?? ""),
      description: typeof b.description === "string" ? b.description : String(b.description ?? ""),
    }
  }

  o.hook = block("hook")
  o.emotion = block("emotion")
  o.cta = block("cta")
  o.structure = block("structure")

  let rd = o.retentionDimensions
  if (!rd || typeof rd !== "object" || Array.isArray(rd)) {
    o.retentionDimensions = { ...DEFAULT_RETENTION_DIMENSIONS }
  } else {
    const r = rd as Record<string, unknown>
    o.retentionDimensions = {
      hookStrength: coerceNumber(r.hookStrength, DEFAULT_RETENTION_DIMENSIONS.hookStrength),
      tempo: coerceNumber(r.tempo, DEFAULT_RETENTION_DIMENSIONS.tempo),
      structureClarity: coerceNumber(r.structureClarity, DEFAULT_RETENTION_DIMENSIONS.structureClarity),
      emotionalArc: coerceNumber(r.emotionalArc, DEFAULT_RETENTION_DIMENSIONS.emotionalArc),
      payoffStrength: coerceNumber(r.payoffStrength, DEFAULT_RETENTION_DIMENSIONS.payoffStrength),
      ctaNaturalness: coerceNumber(r.ctaNaturalness, DEFAULT_RETENTION_DIMENSIONS.ctaNaturalness),
    }
  }

  if (!Array.isArray(o.retentionReasons)) {
    o.retentionReasons = []
  } else {
    o.retentionReasons = o.retentionReasons.map((x) => String(x ?? ""))
  }

  if (!Array.isArray(o.improvementIdeas)) {
    o.improvementIdeas = []
  } else {
    o.improvementIdeas = o.improvementIdeas.map((x) => String(x ?? ""))
  }

  if (!Array.isArray(o.nextVideoIdeas)) {
    o.nextVideoIdeas = []
  } else {
    o.nextVideoIdeas = o.nextVideoIdeas.map((x) => String(x ?? ""))
  }

  for (const k of ["subjectType", "actionType", "sceneChangeLevel", "endingType"] as const) {
    const v = o[k]
    if (v == null || (typeof v === "string" && !v.trim())) {
      o[k] = ""
    } else {
      o[k] = String(v).trim()
    }
  }

  const rawCc = o.competitorComparison
  if (rawCc != null && typeof rawCc === "object" && !Array.isArray(rawCc)) {
    const c = rawCc as Record<string, unknown>
    const toStrArr = (key: string) =>
      Array.isArray(c[key]) ? (c[key] as unknown[]).map((x) => String(x ?? "").trim()) : []
    o.competitorComparison = {
      competitorStrengths: toStrArr("competitorStrengths"),
      yourWeaknesses: toStrArr("yourWeaknesses"),
      priorityImprovements: toStrArr("priorityImprovements"),
    }
  } else {
    delete o.competitorComparison
  }

  return o
}

/** バズりたい＋競合URL時の比較ブロック（正規化で各3件に揃える） */
export const competitorComparisonSchema = z.object({
  competitorStrengths: z.array(z.string()).default([]),
  yourWeaknesses: z.array(z.string()).default([]),
  priorityImprovements: z.array(z.string()).default([]),
})

export type CompetitorComparison = z.infer<typeof competitorComparisonSchema>

/** OpenAI が返す JSON（視聴維持率は次元スコア＋理由2件のみ） */
export const shortsAnalysisAiSchema = z.object({
  hook: z.object({
    value: z.string(),
    description: z.string(),
  }),
  emotion: z.object({
    value: z.string(),
    description: z.string(),
  }),
  cta: z.object({
    value: z.string(),
    description: z.string(),
  }),
  structure: z.object({
    value: z.string(),
    description: z.string(),
  }),
  retentionDimensions: retentionDimensionsSchema,
  retentionReasons: z.array(z.string()),
  improvementIdeas: z.array(z.string()),
  nextVideoIdeas: z.array(z.string()),
  /** メイン被写体の推定タイプ（短いラベル） */
  subjectType: z.string(),
  /** 映像内の動き・行為の推定タイプ（短いラベル） */
  actionType: z.string(),
  /** カット・場面転換の多さ（例: 低 / 中 / 高 など短い表現） */
  sceneChangeLevel: z.string(),
  /** 締め方の型（短いラベル） */
  endingType: z.string(),
  /** growth モードかつ競合URLありのときのみ */
  competitorComparison: competitorComparisonSchema.optional(),
})

export type ShortsAnalysisAi = z.infer<typeof shortsAnalysisAiSchema>

export type ShortsAnalysis = ShortsAnalysisAi & {
  retention: { value: string; description: string }
  retentionScore: number
  retentionLabel: string
  retentionReasons: [string, string]
}

/**
 * AI 出力に視聴維持率の数値・ラベル・表示行を付与する。
 */
export function finalizeShortsAnalysisFromAi(ai: ShortsAnalysisAi): ShortsAnalysis {
  const reasonsRaw = [...ai.retentionReasons].map((s) => s.trim()).filter(Boolean)
  const pair: [string, string] = [
    reasonsRaw[0] ?? "構成とフックのバランスから維持率を推定しています",
    reasonsRaw[1] ?? "タイトルと想定される視聴体験に基づく評価です",
  ]

  const seed = `${ai.hook.value}|${ai.emotion.value}|${ai.structure.value}|${ai.cta.value}|${ai.hook.description.slice(0, 80)}`

  const comp = computeRetentionPrediction(ai.retentionDimensions, pair, seed)

  return {
    ...ai,
    retentionDimensions: comp.dimensions,
    retention: {
      value: comp.retentionValueLine,
      description: comp.retentionDescription,
    },
    retentionScore: comp.retentionScore,
    retentionLabel: comp.retentionLabel,
    retentionReasons: comp.retentionReasons,
  }
}

function normalizeCompetitorComparisonBlock(cc: CompetitorComparison | undefined): CompetitorComparison | undefined {
  if (!cc) return undefined
  const pad3 = (arr: string[]) => {
    const x = arr.map((s) => s.trim()).filter((s) => s.length > 0)
    const filler = "（追記なし）"
    const out = [...x]
    while (out.length < 3) out.push(filler)
    return out.slice(0, 3)
  }
  return {
    competitorStrengths: pad3(cc.competitorStrengths),
    yourWeaknesses: pad3(cc.yourWeaknesses),
    priorityImprovements: pad3(cc.priorityImprovements),
  }
}

export function normalizeShortsAnalysis(analysis: ShortsAnalysis): ShortsAnalysis {
  const pad = (arr: string[], len: number, filler: string) => {
    const out = [...arr].slice(0, len)
    while (out.length < len) out.push(filler)
    return out
  }
  return {
    ...analysis,
    improvementIdeas: pad(analysis.improvementIdeas, 5, "（追記なし）"),
    nextVideoIdeas: pad(analysis.nextVideoIdeas, 4, "（追記なし）"),
    competitorComparison: normalizeCompetitorComparisonBlock(analysis.competitorComparison),
  }
}
