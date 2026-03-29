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
  }
}
