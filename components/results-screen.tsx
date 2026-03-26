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
  Loader2,
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
    <main className="min-h-screen bg-background pb-16 pt-16">
      <div className="max-w-4xl mx-auto px-4 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("results.newAnalysis")}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="rounded-lg text-xs border-primary text-primary hover:bg-primary/10"
          >
            {t("results.nextVideo")}
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-foreground">{t("results.title")}</h1>

        <section>
          <SectionLabel>{t("results.videoInfo")}</SectionLabel>
          {metadataError ? (
            <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              {metadataError}
            </div>
          ) : null}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-0">
              <div className="sm:w-48 h-40 sm:h-auto bg-muted flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                    <Film className="w-10 h-10 text-muted-foreground relative z-10" />
                  </>
                )}
              </div>
              <div className="p-5 flex flex-col justify-between gap-3 flex-1">
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight text-balance">{title}</h3>
                  {authorUrl ? (
                    <a
                      href={authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground mt-1 hover:text-primary hover:underline"
                    >
                      {channelName}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">{channelName}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
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
            <section>
              <SectionLabel>{t("results.aiAnalysis")}</SectionLabel>
              {analysisLoading ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">{t("results.analyzing")}</span>
                </div>
              ) : null}
              {analysisError ? (
                <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {analysisError}
                </div>
              ) : null}
              {analysisLoading && !analysis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ANALYSIS_CARDS.map((card) => (
                    <div
                      key={card.labelKey}
                      className="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", card.colorClass)}>
                          <card.icon className={cn("w-4 h-4", card.iconColor)} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(card.labelKey)}</span>
                      </div>
                      <div className="h-5 w-3/4 max-w-[12rem] rounded-md bg-muted animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-3 w-full rounded bg-muted animate-pulse" />
                        <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : analysis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ANALYSIS_CARDS.map((card) => {
                    const block = analysis[card.key]
                    return (
                      <div
                        key={card.labelKey}
                        className="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", card.colorClass)}>
                            <card.icon className={cn("w-4 h-4", card.iconColor)} />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(card.labelKey)}</span>
                        </div>
                        <p className="text-base font-bold text-foreground">{block.value}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{block.description}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </section>

            {analysisLoading || analysis ? (
            <section>
              <SectionLabel>{t("results.improvements")}</SectionLabel>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{t("results.improvementsTitle")}</h3>
                </div>
                {analysisLoading && !analysis ? (
                  <ul className="flex flex-col gap-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-muted animate-pulse flex-shrink-0" />
                        <span className="h-4 flex-1 rounded bg-muted animate-pulse" />
                      </li>
                    ))}
                  </ul>
                ) : analysis ? (
                  <ul className="flex flex-col gap-3">
                    {analysis.improvementIdeas.map((text, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground leading-relaxed">{text}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
            ) : null}

            {analysisLoading || analysis ? (
            <section>
              <SectionLabel>{t("results.ideas")}</SectionLabel>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-foreground">{t("results.ideasTitle")}</h3>
                </div>
                {analysisLoading && !analysis ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3 border border-border">
                        <span className="h-4 w-4 rounded bg-muted animate-pulse" />
                        <span className="h-4 flex-1 rounded bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : analysis ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.nextVideoIdeas.map((text, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3 border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-default"
                      >
                        <span className="text-primary text-lg font-bold leading-none">→</span>
                        <span className="text-sm text-foreground leading-relaxed">{text}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
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
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pl-1">{children}</h2>
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}
