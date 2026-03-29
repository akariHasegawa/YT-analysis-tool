/**
 * 5アーキタイプのテスト用ダミー分析（視聴維持率の分布確認用）
 */
import type { RetentionDimensions } from "@/lib/retention-constants"

export type RetentionArchetypeFixture = {
  id: string
  title: string
  retentionDimensions: RetentionDimensions
  retentionReasons: [string, string]
  /** finalize と同様のシード想定（フック等のラベル・説明断片） */
  seed: string
}

/** フックが強くテンポも良い */
const strongHookTempo: RetentionArchetypeFixture = {
  id: "strong-hook-tempo",
  title: "フックが強くテンポも良い動画",
  retentionDimensions: {
    hookStrength: 5,
    tempo: 5,
    structureClarity: 4,
    emotionalArc: 4,
    payoffStrength: 4,
    ctaNaturalness: 4,
  },
  retentionReasons: [
    "冒頭で続きが気になる設計になっている",
    "テンポよく次の情報に進み、離脱しにくい",
  ],
  seed: "強烈フック|好奇心|テンポ良い構成|自然な誘導|冒頭はタイトルと一致した衝撃を想定",
}

/** フックは強いが後半失速 */
const hookStrongLateWeak: RetentionArchetypeFixture = {
  id: "hook-strong-late-weak",
  title: "フックは強いが後半失速する動画",
  retentionDimensions: {
    hookStrength: 5,
    tempo: 3,
    structureClarity: 4,
    emotionalArc: 3,
    payoffStrength: 2,
    ctaNaturalness: 3,
  },
  retentionReasons: [
    "冒頭の引きは強く最初の維持は期待できる",
    "オチまでのテンポが落ち、後半の離脱リスクがある",
  ],
  seed: "質問フック|期待→失望|王道3幕|弱い締め|最初の3秒で結論を匂わせる",
}

/** 情報は多いが単調 */
const denseMonotone: RetentionArchetypeFixture = {
  id: "dense-monotone",
  title: "情報は多いが単調な動画",
  retentionDimensions: {
    hookStrength: 3,
    tempo: 3,
    structureClarity: 5,
    emotionalArc: 2,
    payoffStrength: 3,
    ctaNaturalness: 4,
  },
  retentionReasons: [
    "情報の整理はわかりやすい一方、感情の起伏が少ない",
    "説明中心でエンタメ性が薄く、中だるみしやすい",
  ],
  seed: "解説調|淡い感情|箇条書き構成|説明CTA|タイトルはノウハウ列挙型",
}

/** オチが弱く離脱しやすい（釣りだけで中盤以降が空振りしやすい想定） */
const weakPayoff: RetentionArchetypeFixture = {
  id: "weak-payoff",
  title: "オチが弱く離脱しやすい動画",
  retentionDimensions: {
    hookStrength: 2,
    tempo: 3,
    structureClarity: 3,
    emotionalArc: 2,
    payoffStrength: 1,
    ctaNaturalness: 3,
  },
  retentionReasons: [
    "期待を作った後の回収が弱く、物足りなさが出やすい",
    "最後まで見ても納得感が薄く、再視聴につながりにくい",
  ],
  seed: "釣りタイトル|中盤は普通|散漫|オチ弱し|視聴者の疑問が残る終わり方",
}

/** 全体的に完成度が高い */
const highPolish: RetentionArchetypeFixture = {
  id: "high-polish",
  title: "全体的に完成度が高い動画",
  retentionDimensions: {
    hookStrength: 5,
    tempo: 5,
    structureClarity: 5,
    emotionalArc: 5,
    payoffStrength: 5,
    ctaNaturalness: 4,
  },
  retentionReasons: [
    "フックからオチまで一貫したストーリーで離脱しにくい",
    "感情曲線とテンポのバランスが良く、最後まで見やすい",
  ],
  seed: "プロ級フック|感情の山|完璧な起承転結|自然CTA|チャンネルブランドと整合",
}

export const RETENTION_ARCHETYPE_FIXTURES: RetentionArchetypeFixture[] = [
  strongHookTempo,
  hookStrongLateWeak,
  denseMonotone,
  weakPayoff,
  highPolish,
]
