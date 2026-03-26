/** 再生回数から UI 用の相対スコア（1–100）を算出（YouTube がトレンド指標を公開しないための代替） */
const TREND_SCORE_VIEW_SCALE = 2_500_000

export function approximateTrendScoreFromViews(views: number): number {
  if (!Number.isFinite(views) || views < 0) return 1
  const raw = Math.round(100 * (1 - Math.exp(-views / TREND_SCORE_VIEW_SCALE)))
  return Math.min(100, Math.max(1, raw))
}

export function formatCompactCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}

export function formatSecondsAsClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
