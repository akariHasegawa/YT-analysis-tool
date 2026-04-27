"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Eye,
  Clock,
  TrendingUp,
  Zap,
  Heart,
  LayoutTemplate,
  MousePointerClick,
  BarChart2,
  Lightbulb,
  Film,
  ImageIcon,
  FileText,
  Video,
  Copy,
  Check,
  Scale,
  Music2,
  Hash,
  type LucideIcon,
} from "lucide-react"
import { LockedFeature, PlanBadge } from "@/components/locked-feature"
import { ReportDownload } from "@/components/report-download"
import { UpgradeModal, type PlanType } from "@/components/upgrade-modal"
import { cn } from "@/lib/utils"
import type { VideoInfo } from "@/lib/video-info"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { AnalysisMode } from "@/components/mode-selection"
import type { ReferenceInsightsPayload, SourceThumbnailInsight, EnrichedImprovementRow } from "@/lib/reference-insights"
import {
  approximateTrendScoreFromViews,
  formatCompactCount,
  formatSecondsAsClock,
} from "@/lib/format-video-stats"
import { AnalysisLoadingCard } from "@/components/analysis-loading-card"

interface ResultsScreenProps {
  videoInfo: VideoInfo | null
  metadataError?: string
  analysis: ShortsAnalysis | null
  analysisError?: string
  analysisLoading: boolean
  referenceInsights: ReferenceInsightsPayload | null
  onReset: () => void
  onUpgrade?: (plan: PlanType) => void
  // Plan-related props (defaults for demo)
  userPlan?: PlanType
  remainingAnalyses?: number
  maxAnalyses?: number
  isFirstFreeAnalysis?: boolean
  /** growth かつ入力で競合URLを付けたとき true */
  hadCompetitorUrl?: boolean
  analysisMode?: AnalysisMode
  videoUrl?: string
  hashtags?: string
  bgm?: string
}

type AnalysisCardKey = "hook" | "emotion" | "cta" | "structure" | "retention"

const ANALYSIS_CARDS: Array<{
  key: AnalysisCardKey
  icon: LucideIcon
  labelKey: string
  colorClass: string
  iconColor: string
}> = [
  {
    key: "hook" as const,
    icon: Zap,
    labelKey: "results.hook",
    colorClass: "bg-[var(--badge-hook)] text-[var(--badge-hook-fg)]",
    iconColor: "text-[var(--badge-hook-fg)]",
  },
  {
    key: "emotion" as const,
    icon: Heart,
    labelKey: "results.emotion",
    colorClass: "bg-[var(--badge-emotion)] text-[var(--badge-emotion-fg)]",
    iconColor: "text-[var(--badge-emotion-fg)]",
  },
  {
    key: "cta" as const,
    icon: MousePointerClick,
    labelKey: "results.cta",
    colorClass: "bg-[var(--badge-cta)] text-[var(--badge-cta-fg)]",
    iconColor: "text-[var(--badge-cta-fg)]",
  },
  {
    key: "structure" as const,
    icon: LayoutTemplate,
    labelKey: "results.structure",
    colorClass: "bg-[var(--badge-structure)] text-[var(--badge-structure-fg)]",
    iconColor: "text-[var(--badge-structure-fg)]",
  },
  {
    key: "retention" as const,
    icon: BarChart2,
    labelKey: "results.retention",
    colorClass: "bg-[var(--badge-retention)] text-[var(--badge-retention-fg)]",
    iconColor: "text-[var(--badge-retention-fg)]",
  },
]

export function ResultsScreen({
  videoInfo,
  metadataError,
  analysis,
  analysisError,
  analysisLoading,
  referenceInsights,
  onReset,
  onUpgrade,
  userPlan = "free",
  remainingAnalyses = 0,
  maxAnalyses = 1,
  hadCompetitorUrl = false,
  analysisMode = "buzz",
  isFirstFreeAnalysis = false,
  videoUrl = "",
  hashtags = "",
  bgm = "",
}: ResultsScreenProps) {
  const { t, language } = useLanguage()
  const locale = language === "ja" ? "ja-JP" : "en-US"
  const isShortFormPlatform = /tiktok\.com|instagram\.com/.test(videoUrl)
  const hashtagList = hashtags ? hashtags.split(/\s+/).filter(Boolean).slice(0, 8) : []
  
  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [targetPlan, setTargetPlan] = useState<PlanType>("pro")
  
  const handleUpgradeClick = (plan: PlanType) => {
    setTargetPlan(plan)
    setUpgradeModalOpen(true)
  }
  
  const handleUpgrade = (plan: PlanType) => {
    setUpgradeModalOpen(false)
    onUpgrade?.(plan)
  }
  
  // Feature access based on plan
  type CastCount = "1" | "2" | "3+"
  type PromptState = {
    loading: "script" | "video" | null
    scriptPrompt: string | null
    videoPrompt: string | null
    open: "script" | "video" | null
    copied: boolean
    scriptSettingsOpen: boolean
    castCount: CastCount
    dialogueStyle: string
  }
  const [promptStates, setPromptStates] = useState<Record<number, PromptState>>({})

  const getPromptState = (i: number): PromptState =>
    promptStates[i] ?? {
      loading: null,
      scriptPrompt: null,
      videoPrompt: null,
      open: null,
      copied: false,
      scriptSettingsOpen: false,
      castCount: "1",
      dialogueStyle: "",
    }

  const toggleScriptSettings = (i: number) => {
    setPromptStates((prev) => ({
      ...prev,
      [i]: { ...getPromptState(i), scriptSettingsOpen: !getPromptState(i).scriptSettingsOpen, open: null },
    }))
  }

  const generatePrompt = async (i: number, promptType: "script" | "video") => {
    if (!analysis) return
    const state = getPromptState(i)

    // video はキャッシュ優先
    if (promptType === "video") {
      if (state.videoPrompt) {
        setPromptStates((prev) => ({ ...prev, [i]: { ...getPromptState(i), open: "video", copied: false } }))
        return
      }
    }

    setPromptStates((prev) => ({
      ...prev,
      [i]: { ...getPromptState(i), loading: promptType, open: null, scriptSettingsOpen: false },
    }))
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: analysis.nextVideoIdeas[i],
          promptType,
          castCount: state.castCount,
          dialogueStyle: state.dialogueStyle,
          context: {
            channelName,
            hook: analysis.hook.value,
            emotion: analysis.emotion.value,
            subjectType: analysis.subjectType,
            actionType: analysis.actionType,
            improvementIdeas: analysis.improvementIdeas,
            ...(analysis.competitorComparison
              ? { competitorComparison: analysis.competitorComparison }
              : {}),
          },
        }),
      })
      const data = (await res.json()) as { prompt?: string; error?: string }
      if (!res.ok || !data.prompt) throw new Error(data.error ?? "生成失敗")
      setPromptStates((prev) => ({
        ...prev,
        [i]: {
          ...getPromptState(i),
          loading: null,
          scriptPrompt: promptType === "script" ? data.prompt! : getPromptState(i).scriptPrompt,
          videoPrompt: promptType === "video" ? data.prompt! : getPromptState(i).videoPrompt,
          open: promptType,
          copied: false,
        },
      }))
    } catch {
      setPromptStates((prev) => ({
        ...prev,
        [i]: { ...getPromptState(i), loading: null },
      }))
    }
  }

  const copyPrompt = (i: number) => {
    const state = getPromptState(i)
    const text = state.open === "script" ? state.scriptPrompt : state.videoPrompt
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setPromptStates((prev) => ({ ...prev, [i]: { ...getPromptState(i), copied: true } }))
      setTimeout(() => {
        setPromptStates((prev) => ({ ...prev, [i]: { ...getPromptState(i), copied: false } }))
      }, 2000)
    })
  }

  const title = (videoInfo?.title ?? "").trim() || t("results.titleUnknown")
  const channelName = (videoInfo?.channelName ?? "").trim() || t("results.channelUnknown")
  const thumbnailUrl = videoInfo?.thumbnailUrl ?? ""
  const authorUrl = videoInfo?.authorUrl

  const viewsDisplay =
    videoInfo?.views != null ? formatCompactCount(videoInfo.views, locale) : t("results.statUnavailable")
  const durationDisplay =
    videoInfo?.durationSeconds != null
      ? formatSecondsAsClock(videoInfo.durationSeconds)
      : t("results.statUnavailable")
  const trendDisplay =
    videoInfo?.views != null
      ? `${approximateTrendScoreFromViews(videoInfo.views)}/100`
      : t("results.statUnavailable")

  const showAiSections = analysisLoading || analysis != null || Boolean(analysisError)
  // 初回お試しは全部見せる。2回目以降のFreeはロック
  const isProLocked = userPlan === "free" && !isFirstFreeAnalysis

  return (
    <main className="relative min-h-[calc(100vh-4rem)] pb-20 pt-8 sm:pt-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 sm:gap-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onReset}
            className="group flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[oklch(0.88_0.12_260)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t("results.newAnalysis")}
          </button>
          <div className="flex items-center gap-3">
            <PlanBadge plan={userPlan} remainingAnalyses={remainingAnalyses} maxAnalyses={maxAnalyses} />
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              className="neon-button h-9 rounded-xl border-0 text-xs font-semibold sm:text-sm"
            >
              {t("results.nextVideo")}
            </Button>
          </div>
        </div>

        <h1 className="text-balance text-2xl font-bold tracking-tight text-neon-hero sm:text-3xl">{t("results.title")}</h1>

        <section className="space-y-4">
          <SectionLabel>{t("results.videoInfo")}</SectionLabel>
          {metadataError ? (
            <div className="rounded-2xl border border-[oklch(0.75_0.15_85_/_0.35)] bg-[oklch(0.28_0.08_85_/_0.2)] px-5 py-4 text-sm leading-relaxed text-[oklch(0.92_0.05_95)]">
              {metadataError}
            </div>
          ) : null}
          <div className="glass-card neon-card-glow overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-0 sm:flex-row">
              <div className="relative flex h-44 flex-shrink-0 items-center justify-center overflow-hidden bg-[oklch(0.16_0.06_280)] sm:h-auto sm:w-52">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.35_0.15_280)]/40 to-[oklch(0.25_0.12_300)]/30" />
                    <Film className="relative z-10 h-12 w-12 text-[oklch(0.55_0.12_270)]" />
                  </>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-4 p-6 sm:p-7">
                <div>
                  <h3 className="text-balance text-lg font-bold leading-snug text-foreground sm:text-xl">{title}</h3>
                  {authorUrl ? (
                    <a
                      href={authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-[oklch(0.72_0.12_260)] transition-colors hover:text-[oklch(0.85_0.15_250)] hover:underline"
                    >
                      {channelName}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">{channelName}</p>
                  )}
                </div>
                {isShortFormPlatform ? (
                  <div className="flex flex-col gap-2">
                    {bgm && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Music2 className="h-3.5 w-3.5 shrink-0 text-[oklch(0.72_0.12_260)]" />
                        <span className="truncate text-foreground/80">{bgm}</span>
                      </div>
                    )}
                    {hashtagList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {hashtagList.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[oklch(0.25_0.08_280)] px-2.5 py-0.5 text-xs text-[oklch(0.78_0.12_260)]"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {videoInfo?.views != null && (
                      <Stat icon={Eye} label={t("results.views")} value={viewsDisplay} />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <Stat icon={Eye} label={t("results.views")} value={viewsDisplay} />
                    <Stat icon={Clock} label={t("results.duration")} value={durationDisplay} />
                    <Stat icon={TrendingUp} label={t("results.trendScore")} value={trendDisplay} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {isProLocked ? (
          <div className="glass-card neon-card-glow rounded-2xl p-8 text-center space-y-4">
            <p className="text-base font-semibold text-foreground">AI分析はProプラン以上で利用できます</p>
            <p className="text-sm text-muted-foreground">再生数・動画時間などの基本情報は無料で確認できます。</p>
            <button
              type="button"
              onClick={() => handleUpgradeClick("pro")}
              className="mt-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
            >
              Proプランにアップグレード
            </button>
          </div>
        ) : null}

        {showAiSections && !isProLocked ? (
          <>
            <section className="space-y-6">
              <SectionLabel>{t("results.aiAnalysis")}</SectionLabel>

              {analysisLoading && !analysis ? (
                <AnalysisLoadingCard title={t("results.loading.title")} subtitle={t("results.loading.sub")} />
              ) : null}

              {analysisError ? (
                <div className="rounded-2xl border border-[oklch(0.55_0.2_25_/_0.45)] bg-[oklch(0.22_0.08_25_/_0.25)] px-5 py-4 text-sm leading-relaxed text-[oklch(0.88_0.08_25)]">
                  {analysisError}
                </div>
              ) : null}

              {analysis ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {ANALYSIS_CARDS.map((card) => {
                    const block = analysis[card.key]
                    return (
                      <div
                        key={card.labelKey}
                        className="glass-card neon-card-glow flex flex-col gap-4 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_32px_oklch(0.45_0.15_280_/_0.18)]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                              card.colorClass
                            )}
                          >
                            <card.icon className={cn("h-5 w-5", card.iconColor)} />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t(card.labelKey)}
                          </span>
                        </div>
                        <p className="text-base font-bold leading-snug text-foreground">{block.value}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{block.description}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </section>

            {analysis && analysisMode === "growth" && hadCompetitorUrl ? (
              <section className="space-y-4">
                <SectionLabel>{t("results.competitorSection") || "競合比較分析"}</SectionLabel>
                <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.32_0.12_55_/_0.55)] text-[oklch(0.88_0.14_70)]">
                      <Scale className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">
                      {t("results.competitorSectionTitle") || "メイン動画と競合の比較"}
                    </h3>
                  </div>
                  {analysis.competitorComparison ? (
                    <div className="flex flex-col gap-8">
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-[oklch(0.78_0.12_70)]">
                          {t("results.competitorStrengths") || "競合動画が優れている点（3つ）"}
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {analysis.competitorComparison.competitorStrengths.map((line, i) => (
                            <li
                              key={`cs-${i}`}
                              className="rounded-lg border border-[oklch(0.5_0.1_270_/_0.15)] bg-[oklch(0.14_0.05_280_/_0.35)] px-4 py-3 text-sm leading-relaxed text-foreground/95"
                            >
                              <span className="mr-2 font-bold text-[oklch(0.72_0.14_250)]">{i + 1}.</span>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-[oklch(0.78_0.12_300)]">
                          {t("results.yourWeaknesses") || "自分の動画に足りない要素（3つ）"}
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {analysis.competitorComparison.yourWeaknesses.map((line, i) => (
                            <li
                              key={`yw-${i}`}
                              className="rounded-lg border border-[oklch(0.5_0.1_270_/_0.15)] bg-[oklch(0.14_0.05_280_/_0.35)] px-4 py-3 text-sm leading-relaxed text-foreground/95"
                            >
                              <span className="mr-2 font-bold text-[oklch(0.72_0.14_300)]">{i + 1}.</span>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-3 text-sm font-semibold text-[oklch(0.78_0.12_140)]">
                          {t("results.priorityImprovements") || "今すぐ改善すべき優先度TOP3"}
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {analysis.competitorComparison.priorityImprovements.map((line, i) => (
                            <li
                              key={`pi-${i}`}
                              className="rounded-lg border border-[oklch(0.55_0.14_140_/_0.25)] bg-[oklch(0.16_0.06_140_/_0.2)] px-4 py-3 text-sm leading-relaxed text-foreground/95"
                            >
                              <span className="mr-2 font-bold text-[oklch(0.75_0.16_140)]">{i + 1}.</span>
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("results.competitorMissing") || "競合比較データを取得できませんでした。しばらくしてから再度分析してください。"}
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {analysis && referenceInsights?.sourceThumbnail ? (
              <SourceThumbnailInsightCard insight={referenceInsights.sourceThumbnail} videoTitle={title} />
            ) : null}

            {analysis && referenceInsights && referenceInsights.enrichedImprovements.length > 0 ? (
              <LockedFeature isLocked={isProLocked} requiredPlan="pro" onUpgradeClick={handleUpgradeClick}>
                <TaggedImprovementsSection rows={referenceInsights.enrichedImprovements} />
              </LockedFeature>
            ) : null}

            {analysis ? (
              <section className="space-y-4">
                <SectionLabel>{t("results.improvements")}</SectionLabel>
                {referenceInsights?.sourceThumbnail ? (
                  <p className="text-sm text-[oklch(0.7_0.08_260)]">{t("results.improvementsThumbNote")}</p>
                ) : null}
                <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.3_0.1_270_/_0.6)] text-[oklch(0.78_0.16_250)]">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">{t("results.improvementsTitle")}</h3>
                  </div>
                  <ul className="flex flex-col gap-4">
                    {analysis.improvementIdeas.map((text, i) => (
                      <li key={i} className="flex gap-4 border-b border-[oklch(0.55_0.1_270_/_0.12)] pb-4 last:border-0 last:pb-0">
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[oklch(0.35_0.12_270_/_0.45)] text-xs font-bold text-[oklch(0.88_0.14_250)]">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/95">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            {analysis && userPlan === "business" && videoInfo ? (
              <section className="space-y-4">
                <SectionLabel>レポート生成</SectionLabel>
                <ReportDownload analysis={analysis} videoInfo={videoInfo} />
              </section>
            ) : null}

            {analysis ? (
              <LockedFeature isLocked={isProLocked} requiredPlan="pro" onUpgradeClick={handleUpgradeClick}>
                <section className="space-y-4">
                  <SectionLabel>{t("results.ideas")}</SectionLabel>
                  <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.3_0.12_300_/_0.45)] text-[oklch(0.82_0.16_300)]">
                        <Film className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground sm:text-lg">{t("results.ideasTitle")}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {analysis.nextVideoIdeas.map((text, i) => {
                        const ps = getPromptState(i)
                        const activePrompt = ps.open === "script" ? ps.scriptPrompt : ps.videoPrompt
                        return (
                          <div key={i} className="rounded-xl border border-[oklch(0.5_0.1_270_/_0.2)] bg-[oklch(0.16_0.05_280_/_0.35)] overflow-hidden">
                            {/* アイデアテキスト */}
                            <div className="flex items-start gap-3 px-4 py-4">
                              <span className="pt-0.5 text-lg font-bold leading-none text-[oklch(0.72_0.18_250)]">→</span>
                              <span className="text-sm leading-relaxed text-foreground/95">{text}</span>
                            </div>
                            {/* ボタン */}
                            <div className="flex gap-2 px-4 pb-4">
                              <button
                                type="button"
                                onClick={() => toggleScriptSettings(i)}
                                disabled={ps.loading !== null}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                                  ps.scriptSettingsOpen || ps.open === "script"
                                    ? "bg-[oklch(0.45_0.18_250)] text-white"
                                    : "bg-[oklch(0.25_0.08_270_/_0.6)] text-[oklch(0.78_0.12_260)] hover:bg-[oklch(0.35_0.12_260_/_0.7)]",
                                  ps.loading === "script" && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {ps.loading === "script" ? "生成中..." : "台本プロンプト"}
                              </button>
                              <button
                                type="button"
                                onClick={() => generatePrompt(i, "video")}
                                disabled={ps.loading !== null}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                                  ps.open === "video"
                                    ? "bg-[oklch(0.45_0.18_300)] text-white"
                                    : "bg-[oklch(0.25_0.08_270_/_0.6)] text-[oklch(0.78_0.12_260)] hover:bg-[oklch(0.35_0.12_260_/_0.7)]",
                                  ps.loading === "video" && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                <Video className="h-3.5 w-3.5" />
                                {ps.loading === "video" ? "生成中..." : "動画プロンプト"}
                              </button>
                            </div>

                            {/* 台本設定アコーディオン */}
                            {ps.scriptSettingsOpen && (
                              <div className="border-t border-[oklch(0.5_0.1_270_/_0.15)] px-4 pb-4 pt-3 space-y-4 bg-[oklch(0.12_0.04_280_/_0.4)]">
                                {/* 登場人数 */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-[oklch(0.75_0.1_260)]">
                                    登場人数
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/70">
                                    1人＝ナレーション形式　2人以上＝対話形式の台本を生成します
                                  </p>
                                  <div className="flex gap-2">
                                    {(["1", "2", "3+"] as const).map((c) => {
                                      const labels: Record<string, string> = { "1": "1人", "2": "2人", "3+": "3人以上" }
                                      const isSelected = ps.castCount === c
                                      return (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() =>
                                            setPromptStates((prev) => ({
                                              ...prev,
                                              [i]: { ...getPromptState(i), castCount: c, scriptPrompt: null },
                                            }))
                                          }
                                          className={cn(
                                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                                            isSelected
                                              ? "bg-[oklch(0.45_0.18_250)] text-white border-[oklch(0.5_0.2_250)]"
                                              : "bg-[oklch(0.2_0.06_270_/_0.5)] text-muted-foreground border-[oklch(0.4_0.08_270_/_0.3)] hover:border-[oklch(0.5_0.1_270_/_0.5)]"
                                          )}
                                        >
                                          {labels[c]}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* 対話の雰囲気 */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-[oklch(0.75_0.1_260)]">
                                    対話の雰囲気・スタイル（任意）
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/70">
                                    例：白熱した議論　冷静な解説　コミカル　感動的　緊迫感あり
                                  </p>
                                  <input
                                    type="text"
                                    value={ps.dialogueStyle}
                                    onChange={(e) =>
                                      setPromptStates((prev) => ({
                                        ...prev,
                                        [i]: { ...getPromptState(i), dialogueStyle: e.target.value, scriptPrompt: null },
                                      }))
                                    }
                                    placeholder="例：冷静な解説スタイルで"
                                    className="w-full rounded-lg border border-[oklch(0.4_0.08_270_/_0.3)] bg-[oklch(0.15_0.05_270_/_0.5)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[oklch(0.55_0.15_260_/_0.6)] focus:outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => generatePrompt(i, "script")}
                                  disabled={ps.loading !== null}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[oklch(0.45_0.18_250)] py-2 text-xs font-semibold text-white transition-all hover:bg-[oklch(0.5_0.2_250)] disabled:opacity-60"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {ps.loading === "script" ? "生成中..." : "この設定で台本プロンプトを生成"}
                                </button>
                              </div>
                            )}
                            {/* 生成されたプロンプト表示 */}
                            {ps.open && activePrompt && (
                              <div className="border-t border-[oklch(0.5_0.1_270_/_0.15)] mx-0">
                                <div className="flex items-center justify-between px-4 py-2 bg-[oklch(0.12_0.04_280_/_0.5)]">
                                  <span className="text-xs font-semibold text-[oklch(0.65_0.1_270)]">
                                    {ps.open === "script" ? "台本プロンプト" : "動画生成プロンプト"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyPrompt(i)}
                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[oklch(0.72_0.12_260)] transition-colors hover:bg-[oklch(0.3_0.08_270_/_0.4)]"
                                  >
                                    {ps.copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    {ps.copied ? "コピー済み" : "コピー"}
                                  </button>
                                </div>
                                <pre className="whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed text-foreground/80 font-sans max-h-64 overflow-y-auto">
                                  {activePrompt}
                                </pre>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              </LockedFeature>
            ) : null}

          </>
        ) : null}
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={userPlan}
        targetPlan={targetPlan}
        onUpgrade={handleUpgrade}
      />
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.65_0.1_270)]">
      <span className="h-px w-6 bg-gradient-to-r from-[oklch(0.65_0.18_250)] to-transparent sm:w-8" aria-hidden />
      {children}
    </h2>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[oklch(0.58_0.12_270)]" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function TaggedImprovementsSection({ rows }: { rows: EnrichedImprovementRow[] }) {
  const { t } = useLanguage()
  return (
    <section className="space-y-4">
      <SectionLabel>{t("results.taggedImprovementsTitle")}</SectionLabel>
      <p className="text-sm text-muted-foreground">{t("results.taggedImprovementsHint")}</p>
      <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-xl border border-[oklch(0.5_0.1_270_/_0.2)] bg-[oklch(0.14_0.05_280_/_0.4)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className={cn(
                  "inline-flex w-fit shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide",
                  tagClassForImprovement(row.tag)
                )}
              >
                {row.tag}
              </span>
              <span className="text-sm leading-relaxed text-foreground/95">{row.line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function tagClassForImprovement(tag: string): string {
  if (tag === "フック改善") return "bg-[oklch(0.35_0.14_260_/_0.55)] text-[oklch(0.88_0.12_250)]"
  if (tag === "サムネ改善") return "bg-[oklch(0.35_0.14_300_/_0.55)] text-[oklch(0.9_0.12_300)]"
  if (tag === "テンポ改善") return "bg-[oklch(0.35_0.12_200_/_0.55)] text-[oklch(0.88_0.1_200)]"
  if (tag === "オチ改善") return "bg-[oklch(0.35_0.12_40_/_0.55)] text-[oklch(0.9_0.1_85)]"
  return "bg-[oklch(0.3_0.08_270_/_0.5)] text-muted-foreground"
}

function SourceThumbnailInsightCard({
  insight,
  videoTitle,
}: {
  insight: SourceThumbnailInsight
  videoTitle: string
}) {
  const { t } = useLanguage()
  return (
    <section className="space-y-4 scroll-mt-24" id="source-thumbnail-insights" aria-labelledby="source-thumb-heading">
      <SectionLabel>
        <span id="source-thumb-heading">{t("results.sourceThumbTitle")}</span>
      </SectionLabel>
      <p className="text-sm text-muted-foreground">{t("results.sourceThumbHint")}</p>
      <div className="glass-card neon-card-glow overflow-hidden rounded-2xl border-2 border-[oklch(0.55_0.14_280_/_0.45)] shadow-[0_0_28px_oklch(0.45_0.14_280_/_0.12)]">
        <div className="flex flex-col gap-0 lg:flex-row">
          <div className="relative aspect-video w-full flex-shrink-0 bg-[oklch(0.14_0.05_280)] lg:max-w-md">
            <img
              src={insight.thumbnailUrl}
              alt={videoTitle}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7">
            <div>
              <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[oklch(0.75_0.12_260)]">
                <ImageIcon className="h-4 w-4" />
                {t("results.sourceThumbScore")}
                <span className="rounded-md bg-[oklch(0.35_0.12_270_/_0.5)] px-2 py-0.5 text-[11px] text-[oklch(0.9_0.1_250)]">
                  {insight.thumbnailScore}/5
                </span>
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("results.sourceThumbComment")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/95">{insight.thumbnailComment}</p>
            </div>
            <div className="rounded-xl border border-[oklch(0.55_0.12_300_/_0.25)] bg-[oklch(0.18_0.06_290_/_0.5)] p-4 sm:p-5">
              <p className="mb-3 text-sm font-bold text-[oklch(0.88_0.12_280)]">{t("results.sourceThumbIdeas")}</p>
              <ul className="flex flex-col gap-3">
                {insight.improvementIdeas.map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[oklch(0.4_0.14_280_/_0.55)] text-xs font-bold text-[oklch(0.95_0.08_250)]">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-foreground/95">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
