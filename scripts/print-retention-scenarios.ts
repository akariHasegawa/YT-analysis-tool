/**
 * 5アーキタイプの出力を確認する用（npm run print:retention）
 */
import { computeRetentionPrediction, weightedAverageScore } from "../lib/retention-prediction"
import { RETENTION_ARCHETYPE_FIXTURES } from "../lib/retention-test-fixtures"

for (const f of RETENTION_ARCHETYPE_FIXTURES) {
  const w = weightedAverageScore(f.retentionDimensions)
  const r = computeRetentionPrediction(f.retentionDimensions, f.retentionReasons, f.seed)
  console.log("\n---", f.title, "---")
  console.log("weightedAverage:", w.toFixed(3))
  console.log("retentionDimensions:", JSON.stringify(r.dimensions))
  console.log("retentionScore:", r.retentionScore)
  console.log("retentionLabel:", r.retentionLabel)
  console.log("retentionReasons:", r.retentionReasons)
}
