import {
  coerceAnalysisAiJson,
  finalizeShortsAnalysisFromAi,
  normalizeShortsAnalysis,
  shortsAnalysisAiSchema,
  type ShortsAnalysis,
} from "@/lib/shorts-analysis"
import {
  IMPROVEMENT_TAGS,
  parseReferenceInsightsFromPartial,
  type ReferenceInsightsPayload,
} from "@/lib/reference-insights"
import { parseStructureTimelineFromAiPartial, type StructureTimelineFields } from "@/lib/structure-timeline"

export type UnifiedOpenAiParseSuccess = {
  analysis: ShortsAnalysis
  timelineForSheet: StructureTimelineFields
  referenceInsights: ReferenceInsightsPayload
}

const RESEARCH_MODE_INSTRUCTION = `この動画がバズった構造的な理由を分析してください。
出力は『この動画は〜という設計でバズを生んでいます』という文体で。`

const GROWTH_MODE_INSTRUCTION = `この動画の改善点と次に作るべき動画を提案してください。
出力は『あなたの動画は〜を改善することで伸びます』という文体で。`

const COMPETITOR_MODE_INSTRUCTION = `以下の競合動画と比較して差分を分析してください。`

const UNIFIED_JSON_SHAPE = `必ず日本語のみで、次のトップレベルキーをすべて持つ1つのJSONオブジェクトだけを返すこと（前後に説明文やマークダウンを付けない）。

{
  "analysis": {
    "hook": { "value": "短いラベル（例: 質問型フック）", "description": "1〜3文の説明" },
    "emotion": { "value": "短いラベル", "description": "1〜3文の説明" },
    "cta": { "value": "短いラベル", "description": "1〜3文の説明" },
    "structure": { "value": "短いラベル", "description": "1〜3文の説明" },
    "retentionDimensions": {
      "hookStrength": 1,
      "tempo": 1,
      "structureClarity": 1,
      "emotionalArc": 1,
      "payoffStrength": 1,
      "ctaNaturalness": 1
    },
    "retentionReasons": ["短い理由1（20〜45文字程度）", "短い理由2（20〜45文字程度）"],
    "improvementIdeas": ["改善1", "改善2", "改善3", "改善4", "改善5"],
    "nextVideoIdeas": ["アイデア1", "アイデア2", "アイデア3", "アイデア4"],
    "subjectType": "メイン被写体の推定（例: 人物単体、複数人物、物・商品、文字メイン、画面収録のみ）",
    "actionType": "映像の動き・行為の推定（例: 静止〜軽い動き、歩行・移動、スポーツ的動き、手元・食事メイン）",
    "sceneChangeLevel": "カット・場面の切り替わりの多さ。次のいずれか1語: 低 / 中 / 高",
    "endingType": "締め方の型（例: CTAで締める、オチで締める、伏線回収、ループ型、次回予告型）"
  },
  "structureTimeline": {
    "hookStartSec": "",
    "hookEndSec": "",
    "problemStartSec": "",
    "problemEndSec": "",
    "developmentStartSec": "",
    "developmentEndSec": "",
    "endingStartSec": "",
    "endingEndSec": "",
    "ctaStartSec": "",
    "ctaEndSec": "",
    "structureTimeline": "",
    "structureMemo": ""
  },
  "referenceInsights": {
    "sourceThumbnail": null,
    "enrichedImprovements": []
  }
}

【analysis オブジェクトのルール】
- retentionDimensions の各キーは整数1〜5のみ（hookStrength, tempo, structureClarity, emotionalArc, payoffStrength, ctaNaturalness）。
- 6軸すべて同じ整数にしないこと。弱みは1〜2、強みは4〜5など差をつける。
- retentionReasons は必ず2件。パーセント数値は書かない。
- improvementIdeas は必ず5件、nextVideoIdeas は必ず4件。
- improvementIdeas はこの動画固有の改善。字幕がある場合は具体的な発言・秒数を「〇〇秒の『△△』という発言の後に〜」形式で引用すること。汎用フレーズのみは禁止。
- sceneChangeLevel は「低」「中」「高」のいずれか1語。
- 古い形式の "retention": { "value", "description" } は出力しない。

【structureTimeline オブジェクトのルール】
- 字幕テキストがユーザーに提供されている場合: 秒付き字幕を手がかりに、各区間のおおよその開始・終了秒を推定して埋める。
- 字幕が無い・使えない場合: すべての秒フィールドは空文字 "" とする。structureTimeline / structureMemo も簡潔に書くか "" にする。
- フィールド: hookStartSec, hookEndSec, problemStartSec, problemEndSec, developmentStartSec, developmentEndSec, endingStartSec, endingEndSec, ctaStartSec, ctaEndSec, structureTimeline（全体の時系列を1〜5文）, structureMemo（任意1〜3文または""）
- 秒数は「秒」のみ。非負の数値文字列、小数は最大2桁。各ペアは開始≦終了。動画の総秒数（ユーザーメッセージの参考値）を超えない。ミリ秒の整数で書かない。不明・矛盾は ""。

【referenceInsights オブジェクトのルール】
- enrichedImprovements: { "tag", "line" } の配列を必ず2〜6件。tag は次のいずれかのみ: ${IMPROVEMENT_TAGS.join("、")}。
  line は汎用表現だけにせず、字幕がある場合は秒数・発言を引用したこの動画固有の改善案にすること。
- このリクエストにサムネイル画像が添付されている場合:
  - sourceThumbnail に { "thumbnailScore": 1〜5の整数, "thumbnailComment": "...", "improvementIdeas": ["...", "..."]（2〜5件）} を必ず返す。サムネに写っている人物・文字・色・構図を具体的に言及すること。汎用のみ禁止。
- サムネイル画像が添付されていない場合:
  - sourceThumbnail は null。enrichedImprovements は analysis と字幕からのみ生成する。`

const ANALYST_INTRO = `あなたはSNSショート動画（TikTok・Instagram Reels・YouTubeショート）の構成分析に長けたマーケティングアナリストです。
ユーザーから渡されるのは「動画URL」「タイトル」「チャンネル名」と、取得できた場合は「字幕テキスト（秒付き）」です。実際の映像は見られませんが、サムネイル画像が同じメッセージに添付されている場合はその1枚を見て評価に使ってよい。`

const VISUAL_CONTENT_INSTRUCTION = `
【ビジュアル系コンテンツ分析モード】
この動画は字幕・音声テキストが存在しないビジュアル系コンテンツ（ダンス・筋トレ・料理・日常Vlogなど）です。
以下の観点で分析してください：

1. **ハッシュタグ戦略分析**
   - 使用ハッシュタグのジャンル傾向（ニッチ系 vs 大衆系の組み合わせ）
   - 競合が少なく伸びやすいタグ vs 埋もれやすい大手タグの評価
   - おすすめハッシュタグの改善案をimprovementIdeasに含めること

2. **アカウントニッチ判定**
   - チャンネル名・タイトル・ハッシュタグからアカウントの専門ジャンルを推定（例：フィットネス特化、食特化、美容特化）
   - ジャンル特化度（全振りか複数ジャンル混在か）をstructureMemoに記載

3. **BGM・音源分析**
   - 使用音源がトレンド音源かオリジナル音源かを判定
   - トレンド音源使用の場合：アルゴリズム上の優位性をコメント
   - improvementIdeasにBGM戦略の改善案を含めること

4. **ビジュアル分析**（サムネイル画像がある場合）
   - 映像の構図・カラートーン・テキストオーバーレイの有無
   - 視覚的な第一印象の強さ

字幕がないため structureTimeline の秒数フィールドはすべて "" にすること。`

export function buildUnifiedAnalysisSystemPrompt(
  mode: "research" | "growth",
  hasCompetitorUrl: boolean,
  hasThumbnailImage: boolean,
  isVisualContent: boolean = false
): string {
  const modeBlock = mode === "research" ? RESEARCH_MODE_INSTRUCTION : GROWTH_MODE_INSTRUCTION
  let out = `${ANALYST_INTRO}

${UNIFIED_JSON_SHAPE.trim()}

${modeBlock}`
  if (isVisualContent) {
    out += `\n\n${VISUAL_CONTENT_INSTRUCTION.trim()}`
  }
  if (hasCompetitorUrl) {
    out += `\n\n${COMPETITOR_MODE_INSTRUCTION}`
    if (mode === "growth") {
      out += `

【競合比較分析・必須（growth モード）】
競合動画との比較分析を必ず行い、analysis オブジェクトに次のキーを必ず含めてください（各配列は文字列をちょうど3件）:
"competitorComparison": {
  "competitorStrengths": ["競合の強み1", "競合の強み2", "競合の強み3"],
  "yourWeaknesses": ["自分の動画の弱点1", "弱点2", "弱点3"],
  "priorityImprovements": ["今すぐ改善すべき優先度TOP3の1つ目", "2つ目", "3つ目"]
}
競合字幕・メイン字幕・タイトル文脈に基づき、抽象的な一般論ではなく比較に根ざした具体的内容にすること。`
    }
  }
  if (hasThumbnailImage) {
    out +=
      "\n\n【重要】このリクエストには分析対象のサムネイル画像が添付されている。referenceInsights.sourceThumbnail は必須（null にしない）。"
  }
  return out
}

export function parseUnifiedOpenAiAnalysisContent(
  content: string,
  options: {
    durationSec: number | null
    sourceThumbnailUrl: string | undefined
  }
): { ok: true; value: UnifiedOpenAiParseSuccess } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return { ok: false, error: "JSON parse failed" }
  }

  if (json == null || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "root not object" }
  }

  const root = json as Record<string, unknown>
  let analysisPart: unknown
  let timelinePart: unknown
  let refPart: unknown

  if (root.analysis != null && typeof root.analysis === "object" && !Array.isArray(root.analysis)) {
    analysisPart = root.analysis
    timelinePart = root.structureTimeline
    refPart = root.referenceInsights
  } else if (root.hook != null && typeof root.hook === "object") {
    analysisPart = json
    timelinePart = undefined
    refPart = undefined
  } else {
    return { ok: false, error: "missing analysis wrapper" }
  }

  const coerced = coerceAnalysisAiJson(analysisPart)
  const ar = shortsAnalysisAiSchema.safeParse(coerced)
  if (!ar.success) {
    return { ok: false, error: "analysis schema" }
  }

  const analysis = normalizeShortsAnalysis(finalizeShortsAnalysisFromAi(ar.data))
  const timelineForSheet = parseStructureTimelineFromAiPartial(timelinePart, options.durationSec)
  const referenceInsights = parseReferenceInsightsFromPartial(refPart, options.sourceThumbnailUrl)

  return { ok: true, value: { analysis, timelineForSheet, referenceInsights } }
}
