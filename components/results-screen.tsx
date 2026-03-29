"use client"

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
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoInfo } from "@/lib/video-info"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
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
  onReset: () => void
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
  onReset,
}: ResultsScreenProps) {
  const { t, language } = useLanguage()
  const locale = language === "ja" ? "ja-JP" : "en-US"

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
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="neon-button h-9 rounded-xl border-0 text-xs font-semibold sm:text-sm"
          >
            {t("results.nextVideo")}
          </Button>
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
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <Stat icon={Eye} label={t("results.views")} value={viewsDisplay} />
                  <Stat icon={Clock} label={t("results.duration")} value={durationDisplay} />
                  <Stat icon={TrendingUp} label={t("results.trendScore")} value={trendDisplay} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {showAiSections ? (
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

            {analysis ? (
              <section className="space-y-4">
                <SectionLabel>{t("results.improvements")}</SectionLabel>
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

            {analysis ? (
              <section className="space-y-4">
                <SectionLabel>{t("results.ideas")}</SectionLabel>
                <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.3_0.12_300_/_0.45)] text-[oklch(0.82_0.16_300)]">
                      <Film className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground sm:text-lg">{t("results.ideasTitle")}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {analysis.nextVideoIdeas.map((text, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-[oklch(0.5_0.1_270_/_0.2)] bg-[oklch(0.16_0.05_280_/_0.35)] px-4 py-4 transition-all hover:border-[oklch(0.6_0.14_260_/_0.35)] hover:bg-[oklch(0.22_0.08_280_/_0.4)]"
                      >
                        <span className="pt-0.5 text-lg font-bold leading-none text-[oklch(0.72_0.18_250)]">→</span>
                        <span className="text-sm leading-relaxed text-foreground/95">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
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
