import { describe, expect, it } from "vitest"
import {
  averageToRetentionPercent,
  computeRetentionPrediction,
  weightedAverageScore,
  weightedAvgToBasePercent,
} from "@/lib/retention-prediction"
import { RETENTION_ARCHETYPE_FIXTURES } from "@/lib/retention-test-fixtures"
import {
  RETENTION_NEUTRAL_AVG,
  RETENTION_PERCENT_AT_NEUTRAL,
  RETENTION_PERCENT_MAX,
  RETENTION_PERCENT_MIN,
  RETENTION_PERCENT_PER_AVG_UNIT,
} from "@/lib/retention-constants"

describe("weightedAvgToBasePercent（中立基準）", () => {
  it("すべて3のとき中立付近（67.5 四捨五入で68）", () => {
    expect(weightedAvgToBasePercent(RETENTION_NEUTRAL_AVG)).toBe(Math.round(RETENTION_PERCENT_AT_NEUTRAL))
  })

  it("端点は MIN / MAX にクランプ", () => {
    expect(weightedAvgToBasePercent(1)).toBe(RETENTION_PERCENT_MIN)
    expect(weightedAvgToBasePercent(5)).toBe(RETENTION_PERCENT_MAX)
  })

  it("旧線形と比べ低評価はより下がりやすい（avg=2.5）", () => {
    const neutralLinear = 45 + ((2.5 - 1) / 4) * 45 // 61.875 -> 62
    const newPct = weightedAvgToBasePercent(2.5)
    expect(newPct).toBe(
      Math.round(RETENTION_PERCENT_AT_NEUTRAL + (2.5 - RETENTION_NEUTRAL_AVG) * RETENTION_PERCENT_PER_AVG_UNIT)
    )
    expect(newPct).toBeLessThan(neutralLinear)
  })
})

describe("5アーキタイプのばらつき", () => {
  const results = RETENTION_ARCHETYPE_FIXTURES.map((f) => {
    const pred = computeRetentionPrediction(f.retentionDimensions, f.retentionReasons, f.seed)
    return {
      id: f.id,
      title: f.title,
      inputWeightedAvg: weightedAverageScore(f.retentionDimensions),
      ...pred,
    }
  })

  it("5件の retentionScore の幅が十分ある（>= 12pt）", () => {
    const scores = results.map((r) => r.retentionScore)
    const spread = Math.max(...scores) - Math.min(...scores)
    expect(spread).toBeGreaterThanOrEqual(12)
  })

  it("少なくとも3種類のラベルが混在", () => {
    const labels = new Set(results.map((r) => r.retentionLabel))
    expect(labels.size).toBeGreaterThanOrEqual(3)
  })

  it("弱いオチ archetype は高完成度より明確に低い", () => {
    const weak = results.find((r) => r.id === "weak-payoff")!
    const hi = results.find((r) => r.id === "high-polish")!
    expect(weak.retentionScore).toBeLessThan(hi.retentionScore)
    expect(hi.retentionScore - weak.retentionScore).toBeGreaterThanOrEqual(10)
  })

  it("後半失速は「強フック・テンポ良」より低い", () => {
    const late = results.find((r) => r.id === "hook-strong-late-weak")!
    const st = results.find((r) => r.id === "strong-hook-tempo")!
    expect(late.retentionScore).toBeLessThan(st.retentionScore)
  })

  it("averageToRetentionPercent は weightedAvgToBasePercent と同じ", () => {
    expect(averageToRetentionPercent(3.2)).toBe(weightedAvgToBasePercent(3.2))
  })
})
