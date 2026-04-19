"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, ArrowLeft, PlayCircle, Users, Search, Rocket, FileText, Lightbulb, TrendingUp, Sparkles } from "lucide-react"
import { isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { DEFAULT_SAMPLE_SHORT_URLS } from "@/lib/default-sample-urls"
import { cn } from "@/lib/utils"
import type { AnalysisMode } from "@/components/mode-selection"

type VideoType = "short" | "regular"

interface UrlInputScreenProps {
  onAnalyze: (url: string, competitorUrl?: string) => void
  onBack?: () => void
  mode?: AnalysisMode
}

// Mode-specific accent colors
const MODE_STYLES = {
  buzz: {
    accentFrom: "oklch(0.65 0.18 195)",
    accentTo: "oklch(0.58 0.2 250)",
    buttonBg: "linear-gradient(135deg, oklch(0.6 0.18 200), oklch(0.55 0.2 245))",
    buttonGlow: "0 0 20px oklch(0.55 0.18 220 / 0.4), 0 0 40px oklch(0.45 0.15 240 / 0.2)",
    iconBg: "oklch(0.22 0.08 220 / 0.5)",
    iconColor: "oklch(0.72 0.16 210)",
    borderAccent: "oklch(0.55 0.15 220 / 0.3)",
    icon: Search,
    titleKey: "input.buzz.title",
    titleFallback: "バズ分析",
  },
  growth: {
    accentFrom: "oklch(0.72 0.18 85)",
    accentTo: "oklch(0.62 0.22 30)",
    buttonBg: "linear-gradient(135deg, oklch(0.68 0.18 75), oklch(0.58 0.2 35))",
    buttonGlow: "0 0 20px oklch(0.6 0.18 60 / 0.4), 0 0 40px oklch(0.5 0.15 50 / 0.2)",
    iconBg: "oklch(0.24 0.08 60 / 0.5)",
    iconColor: "oklch(0.78 0.16 70)",
    borderAccent: "oklch(0.6 0.15 60 / 0.3)",
    icon: Rocket,
    titleKey: "input.growth.title",
    titleFallback: "バズりたい",
  },
}

// Features list for growth mode
const GROWTH_FEATURES = [
  { icon: FileText, key: "input.growth.feature1", fallback: "改善提案レポート" },
  { icon: Lightbulb, key: "input.growth.feature2", fallback: "次回作アイデア4つ" },
  { icon: TrendingUp, key: "input.growth.feature3", fallback: "台本・動画プロンプト生成" },
]

export function UrlInputScreen({ onAnalyze, onBack, mode = "buzz" }: UrlInputScreenProps) {
  const { t } = useLanguage()
  const [url, setUrl] = useState("")
  const [competitorUrl, setCompetitorUrl] = useState("")
  const [error, setError] = useState("")
  const [competitorError, setCompetitorError] = useState("")
  const [videoType, setVideoType] = useState<VideoType>("short")

  const styles = MODE_STYLES[mode]
  const ModeIcon = styles.icon
  const isGrowthMode = mode === "growth"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let hasError = false

    if (!url.trim()) {
      setError(t("input.error.required"))
      hasError = true
    } else if (!isLikelyYouTubeUrl(url.trim())) {
      setError(t("input.error.invalidYoutube"))
      hasError = true
    }

    if (isGrowthMode && competitorUrl.trim() && !isLikelyYouTubeUrl(competitorUrl.trim())) {
      setCompetitorError(t("input.error.invalidYoutube"))
      hasError = true
    }

    if (hasError) return

    setError("")
    setCompetitorError("")
    onAnalyze(url, isGrowthMode ? competitorUrl : undefined)
  }

  const isSubmitDisabled = !url.trim()

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* Back button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="group mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[oklch(0.88_0.12_260)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t("input.back") || "モード選択に戻る"}
          </button>
        )}

        {/* Mode indicator & title */}
        <div className="mb-10 text-center animate-fade-up">
          <div className="mb-4 flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: styles.iconBg }}
            >
              <ModeIcon 
                className="h-7 w-7" 
                style={{ color: styles.iconColor }}
              />
            </div>
          </div>
          <h1 
            className="mb-2 font-display text-xl font-bold sm:text-2xl"
            style={{
              background: `linear-gradient(90deg, ${styles.accentFrom}, ${styles.accentTo})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {t(styles.titleKey) || styles.titleFallback}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGrowthMode 
              ? (t("input.growth.subtitle") || "あなたの動画を分析して改善点を提案します")
              : (t("input.buzz.subtitle") || "バズった動画の構造を分析します")
            }
          </p>
        </div>

        {/* Input card */}
        <div 
          className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8 md:p-10 animate-fade-up-delay-1"
          style={{ borderColor: styles.borderAccent }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Video type selector */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground/90">{t("input.videoType")}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVideoType("short")}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition-all",
                    videoType === "short"
                      ? "border-transparent shadow-lg text-white"
                      : "border-[oklch(0.5_0.1_270_/_0.25)] bg-[oklch(0.18_0.05_280_/_0.4)] text-muted-foreground hover:border-[oklch(0.55_0.14_270_/_0.35)] hover:text-foreground"
                  )}
                  style={videoType === "short" ? { background: styles.buttonBg } : {}}
                >
                  {t("input.videoType.short")}
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType("regular")}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition-all",
                    videoType === "regular"
                      ? "border-transparent shadow-lg text-white"
                      : "border-[oklch(0.5_0.1_270_/_0.25)] bg-[oklch(0.18_0.05_280_/_0.4)] text-muted-foreground hover:border-[oklch(0.55_0.14_270_/_0.35)] hover:text-foreground"
                  )}
                  style={videoType === "regular" ? { background: styles.buttonBg } : {}}
                >
                  {t("input.videoType.regular")}
                </button>
              </div>
            </div>

            {/* Main URL input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="video-url" className="text-sm font-medium text-foreground/90">
                {isGrowthMode 
                  ? (t("input.growth.urlLabel") || "自分の動画URL")
                  : (t("input.buzz.urlLabel") || "分析する動画URL")
                }
              </label>
              <div className="relative">
                <PlayCircle 
                  className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2"
                  style={{ color: styles.iconColor }}
                />
                <Input
                  id="video-url"
                  type="url"
                  placeholder={t("input.placeholder")}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (error) setError("")
                  }}
                  className="h-12 rounded-xl border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.05_280_/_0.55)] pl-11 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[oklch(0.65_0.16_250)] focus-visible:ring-[oklch(0.55_0.18_270_/_0.35)]"
                />
              </div>
              {error && <p className="text-sm text-[oklch(0.72_0.18_25)]">{error}</p>}
            </div>

            {/* Competitor URL input (growth mode only) */}
            {isGrowthMode && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="competitor-url" className="text-sm font-medium text-foreground/90">
                    {t("input.growth.competitorLabel") || "競合動画URL"}
                  </label>
                  <span className="rounded-full bg-[oklch(0.25_0.08_60_/_0.5)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.8_0.14_70)]">
                    {t("input.optional") || "任意"}
                  </span>
                </div>
                <div className="relative">
                  <Users 
                    className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2"
                    style={{ color: "oklch(0.6 0.12 60)" }}
                  />
                  <Input
                    id="competitor-url"
                    type="url"
                    placeholder={t("input.growth.competitorPlaceholder") || "比較したい競合の動画URL"}
                    value={competitorUrl}
                    onChange={(e) => {
                      setCompetitorUrl(e.target.value)
                      if (competitorError) setCompetitorError("")
                    }}
                    className="h-12 rounded-xl border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.05_280_/_0.55)] pl-11 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[oklch(0.65_0.16_250)] focus-visible:ring-[oklch(0.55_0.18_270_/_0.35)]"
                  />
                </div>
                {competitorError && <p className="text-sm text-[oklch(0.72_0.18_25)]">{competitorError}</p>}
                
                {/* Competitor comparison badge */}
                {competitorUrl.trim() && isLikelyYouTubeUrl(competitorUrl.trim()) && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-[oklch(0.2_0.08_60_/_0.4)] px-3 py-2 border border-[oklch(0.5_0.12_60_/_0.3)]">
                    <Sparkles className="h-4 w-4 text-[oklch(0.78_0.16_70)]" />
                    <span className="text-xs text-[oklch(0.85_0.1_75)]">
                      {t("input.growth.comparisonBadge") || "差分比較レポートが生成されます"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Features list (growth mode) */}
            {isGrowthMode && (
              <div className="rounded-xl bg-[oklch(0.14_0.04_280_/_0.5)] p-4 border border-[oklch(0.4_0.08_270_/_0.2)]">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("input.growth.featuresTitle") || "生成されるレポート"}
                </p>
                <div className="flex flex-col gap-2">
                  {GROWTH_FEATURES.map((feature) => (
                    <div key={feature.key} className="flex items-center gap-2.5">
                      <feature.icon className="h-4 w-4 text-[oklch(0.7_0.14_70)]" />
                      <span className="text-sm text-foreground/90">
                        {t(feature.key) || feature.fallback}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitDisabled}
              className={cn(
                "h-12 w-full rounded-xl border-0 text-base font-semibold text-white transition-all",
                isSubmitDisabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                background: isSubmitDisabled 
                  ? "oklch(0.35 0.05 270)" 
                  : styles.buttonBg,
                boxShadow: isSubmitDisabled ? "none" : styles.buttonGlow,
              }}
            >
              {t("input.button.start") || "分析スタート"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Sample URLs */}
          <div className="mt-8 border-t border-[oklch(0.55_0.12_270_/_0.15)] pt-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("input.samples")}
            </p>
            <div className="flex flex-col gap-2.5">
              {DEFAULT_SAMPLE_SHORT_URLS.map((sample, idx) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setUrl(sample)}
                  className="truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs text-[oklch(0.72_0.14_260)] transition-colors hover:bg-[oklch(0.25_0.08_280_/_0.35)] hover:text-[oklch(0.88_0.12_250)]"
                >
                  {t(`input.sample${idx + 1}`)} · {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">{t("input.footerNote")}</p>
      </div>
    </main>
  )
}
