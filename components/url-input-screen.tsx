"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react"
import { isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { DEFAULT_SAMPLE_SHORT_URLS } from "@/lib/default-sample-urls"
import { cn } from "@/lib/utils"

type VideoType = "short" | "regular"

interface UrlInputScreenProps {
  onAnalyze: (url: string) => void
}

export function UrlInputScreen({ onAnalyze }: UrlInputScreenProps) {
  const { t } = useLanguage()
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [videoType, setVideoType] = useState<VideoType>("short")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      setError(t("input.error.required"))
      return
    }
    if (!isLikelyYouTubeUrl(url.trim())) {
      setError(t("input.error.invalidYoutube"))
      return
    }
    setError("")
    onAnalyze(url)
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 pb-20 pt-10 sm:pt-14 md:pt-20">
      <div className="mx-auto w-full max-w-2xl">
        {/* ヒーロー */}
        <div className="mb-12 text-center sm:mb-16">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.55_0.14_270_/_0.3)] bg-[oklch(0.2_0.06_280_/_0.45)] px-4 py-2 text-xs font-medium tracking-widest text-[oklch(0.82_0.12_260)] shadow-[0_0_24px_oklch(0.45_0.15_280_/_0.15)] sm:text-sm">
              <Sparkles className="h-4 w-4 text-[oklch(0.75_0.18_250)]" />
              {t("input.heading")}
            </span>
          </div>

          <h1 className="mb-6 text-balance text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl md:text-5xl md:leading-[1.3]">
            <span className="text-neon-hero block">{t("hero.title.line1")}</span>
            <span className="mt-1 block text-neon-accent">{t("hero.title.line2")}</span>
          </h1>

          <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            <span className="block">{t("hero.sub.line1")}</span>
            <span className="mt-1 block">{t("hero.sub.line2")}</span>
            <span className="mt-2 block text-sm text-[oklch(0.72_0.14_260)]">{t("hero.sub.line3")}</span>
          </p>
        </div>

        {/* 入力カード */}
        <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8 md:p-10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground/90">{t("input.videoType")}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVideoType("short")}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition-all",
                    videoType === "short"
                      ? "neon-button border-transparent shadow-lg"
                      : "border-[oklch(0.5_0.1_270_/_0.25)] bg-[oklch(0.18_0.05_280_/_0.4)] text-muted-foreground hover:border-[oklch(0.55_0.14_270_/_0.35)] hover:text-foreground"
                  )}
                >
                  {t("input.videoType.short")}
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType("regular")}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-semibold transition-all",
                    videoType === "regular"
                      ? "neon-button border-transparent shadow-lg"
                      : "border-[oklch(0.5_0.1_270_/_0.25)] bg-[oklch(0.18_0.05_280_/_0.4)] text-muted-foreground hover:border-[oklch(0.55_0.14_270_/_0.35)] hover:text-foreground"
                  )}
                >
                  {t("input.videoType.regular")}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="video-url" className="text-sm font-medium text-foreground/90">
                {t("input.label")}
              </label>
              <div className="relative">
                <PlayCircle className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[oklch(0.6_0.12_270)]" />
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
              {error ? <p className="text-sm text-[oklch(0.72_0.18_25)]">{error}</p> : null}
            </div>

            <Button
              type="submit"
              size="lg"
              className="neon-button h-12 w-full rounded-xl border-0 text-base font-semibold"
            >
              {t("input.button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

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
