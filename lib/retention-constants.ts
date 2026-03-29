/**
 * 視聴維持率予測の調整用定数（重み・変換・ラベル・微調整）
 * 仕様の重みをベースに、オチ・後半の差が出やすいよう構成とペイオフのみ微調整（合計1.0）
 */

export type RetentionDimensions = {
  hookStrength: number
  tempo: number
  structureClarity: number
  emotionalArc: number
  payoffStrength: number
  ctaNaturalness: number
}

/** 1〜5 採点の下限・上限 */
export const RETENTION_DIMENSION_MIN = 1
export const RETENTION_DIMENSION_MAX = 5

/** 重み付き平均の「中立」スコア（すべて3のとき） */
export const RETENTION_NEUTRAL_AVG = 3

/** 最終パーセントの下限・上限 */
export const RETENTION_PERCENT_MIN = 45
export const RETENTION_PERCENT_MAX = 90

/**
 * 重み付き平均が RETENTION_NEUTRAL_AVG のときの基準%（四捨五入前の中心）
 * 旧: 線形 1→45, 5→90 では avg=3 が 67.5
 */
export const RETENTION_PERCENT_AT_NEUTRAL = 67.5

/**
 * 重み付き平均が 1.0 変化したときの%変化（中立基準）。
 * 旧線形は端点一致で中央付近に値が溜まりやすいため、
 * 中立±2 を 45〜90 に載せる感度として 12.5 を採用（高得点帯の差も確保）。
 */
export const RETENTION_PERCENT_PER_AVG_UNIT = 12.5

/** 各次元の重み（合計 1.0） */
export const RETENTION_WEIGHT_HOOK = 0.25
export const RETENTION_WEIGHT_TEMPO = 0.2
export const RETENTION_WEIGHT_STRUCTURE = 0.18
export const RETENTION_WEIGHT_EMOTION = 0.15
export const RETENTION_WEIGHT_PAYOFF = 0.17
export const RETENTION_WEIGHT_CTA = 0.05

export const RETENTION_WEIGHTS: Record<keyof RetentionDimensions, number> = {
  hookStrength: RETENTION_WEIGHT_HOOK,
  tempo: RETENTION_WEIGHT_TEMPO,
  structureClarity: RETENTION_WEIGHT_STRUCTURE,
  emotionalArc: RETENTION_WEIGHT_EMOTION,
  payoffStrength: RETENTION_WEIGHT_PAYOFF,
  ctaNaturalness: RETENTION_WEIGHT_CTA,
}

/**
 * シードから決定的に足し引きする範囲（含む）
 * delta = (h % span) + RETENTION_ADJUST_DELTA_MIN
 */
export const RETENTION_ADJUST_DELTA_MIN = -3
export const RETENTION_ADJUST_DELTA_MAX = 3

/** ラベル判定（上限 inclusive、昇順で先にマッチ） */
export const RETENTION_LABEL_BANDS: ReadonlyArray<{ readonly max: number; readonly label: string }> = [
  { max: 54, label: "低め" },
  { max: 64, label: "やや低め" },
  { max: 74, label: "標準〜やや高め" },
  { max: 84, label: "高め" },
  { max: 90, label: "かなり高め" },
]
