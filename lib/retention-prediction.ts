/**
 * 視聴維持率予測: 1〜5 の次元スコアを重み付けし 45〜90% にマッピングする。
 * 数値・ラベルは決定的（同じ入力なら同じ出力）。
 */

import {
  RETENTION_ADJUST_DELTA_MAX,
  RETENTION_ADJUST_DELTA_MIN,
  RETENTION_DIMENSION_MAX,
  RETENTION_DIMENSION_MIN,
  RETENTION_LABEL_BANDS,
  RETENTION_NEUTRAL_AVG,
  RETENTION_PERCENT_AT_NEUTRAL,
  RETENTION_PERCENT_MAX,
  RETENTION_PERCENT_MIN,
  RETENTION_PERCENT_PER_AVG_UNIT,
  RETENTION_WEIGHTS,
  type RetentionDimensions,
} from "@/lib/retention-constants"

export type { RetentionDimensions }

/** @deprecated 互換用。RETENTION_WEIGHTS は retention-constants を参照 */
export { RETENTION_WEIGHTS } from "@/lib/retention-constants"

/** 1〜5 にクランプ（小数は四捨五入） */
export function clampDimensionScore(n: number): number {
  const r = Math.round(Number(n))
  return Math.min(
    RETENTION_DIMENSION_MAX,
    Math.max(RETENTION_DIMENSION_MIN, Number.isFinite(r) ? r : RETENTION_NEUTRAL_AVG)
  )
}

export function clampAllDimensions(d: RetentionDimensions): RetentionDimensions {
  return {
    hookStrength: clampDimensionScore(d.hookStrength),
    tempo: clampDimensionScore(d.tempo),
    structureClarity: clampDimensionScore(d.structureClarity),
    emotionalArc: clampDimensionScore(d.emotionalArc),
    payoffStrength: clampDimensionScore(d.payoffStrength),
    ctaNaturalness: clampDimensionScore(d.ctaNaturalness),
  }
}

/** 重み付き平均（理論上 RETENTION_DIMENSION_MIN〜MAX） */
export function weightedAverageScore(dimensions: RetentionDimensions): number {
  const d = clampAllDimensions(dimensions)
  let sum = 0
  for (const key of Object.keys(RETENTION_WEIGHTS) as (keyof RetentionDimensions)[]) {
    sum += d[key] * RETENTION_WEIGHTS[key]
  }
  return sum
}

/**
 * 重み付き平均を基準%に変換（中立 RETENTION_NEUTRAL_AVG を中心に線形、端は MIN/MAX でクランプ）
 */
export function weightedAvgToBasePercent(weightedAvg: number): number {
  const a = Math.min(RETENTION_DIMENSION_MAX, Math.max(RETENTION_DIMENSION_MIN, weightedAvg))
  const raw = RETENTION_PERCENT_AT_NEUTRAL + (a - RETENTION_NEUTRAL_AVG) * RETENTION_PERCENT_PER_AVG_UNIT
  const rounded = Math.round(raw)
  return Math.min(RETENTION_PERCENT_MAX, Math.max(RETENTION_PERCENT_MIN, rounded))
}

/** 旧名互換 */
export function averageToRetentionPercent(weightedAvg: number): number {
  return weightedAvgToBasePercent(weightedAvg)
}

/** 分析テキストから決定的な微調整（RETENTION_ADJUST_DELTA_MIN〜MAX） */
export function deterministicPercentAdjustment(seed: string, basePercent: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const span = RETENTION_ADJUST_DELTA_MAX - RETENTION_ADJUST_DELTA_MIN + 1
  const delta = (h % span) + RETENTION_ADJUST_DELTA_MIN
  return Math.min(RETENTION_PERCENT_MAX, Math.max(RETENTION_PERCENT_MIN, basePercent + delta))
}

export function retentionPercentToLabel(percent: number): string {
  const clamped = Math.min(RETENTION_PERCENT_MAX, Math.max(RETENTION_PERCENT_MIN, percent))
  for (const band of RETENTION_LABEL_BANDS) {
    if (clamped <= band.max) return band.label
  }
  return RETENTION_LABEL_BANDS[RETENTION_LABEL_BANDS.length - 1]!.label
}

export function formatRetentionValueLine(percent: number, label: string): string {
  return `視聴維持率予測：${percent}%（${label}）`
}

export function formatRetentionDescription(reasons: string[]): string {
  const trimmed = reasons.map((r) => r.trim()).filter(Boolean)
  if (trimmed.length === 0) return ""
  return trimmed.map((r) => `・${r}`).join("\n")
}

export type RetentionComputationResult = {
  retentionScore: number
  retentionLabel: string
  retentionReasons: [string, string]
  retentionValueLine: string
  retentionDescription: string
  dimensions: RetentionDimensions
  weightedAverage: number
}

/**
 * 次元・理由から最終表示用フィールドを生成。
 * seed は hook/emotion/structure の短文など、動画ごとに変わる文字列（微調整用）。
 */
export function computeRetentionPrediction(
  dimensions: RetentionDimensions,
  reasons: string[],
  seed: string
): RetentionComputationResult {
  const d = clampAllDimensions(dimensions)
  const avg = weightedAverageScore(d)
  const basePct = weightedAvgToBasePercent(avg)
  const retentionScore = deterministicPercentAdjustment(seed, basePct)
  const retentionLabel = retentionPercentToLabel(retentionScore)

  const r0 = (reasons[0] ?? "総合的な構成から維持率を推定しました").trim()
  const r1 = (reasons[1] ?? "タイトルと想定される展開に基づく評価です").trim()
  const retentionReasons: [string, string] = [r0, r1]

  return {
    retentionScore,
    retentionLabel,
    retentionReasons,
    retentionValueLine: formatRetentionValueLine(retentionScore, retentionLabel),
    retentionDescription: formatRetentionDescription(retentionReasons),
    dimensions: d,
    weightedAverage: avg,
  }
}
