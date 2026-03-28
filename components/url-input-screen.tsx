"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react"
import { isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { DEFAULT_SAMPLE_SHORT_URLS } from "@/lib/default-sample-urls"

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
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Background grid effect */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo / badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            {t('input.heading')}
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance mb-3">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed text-pretty">
            {t('description')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Video Type Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('input.videoType')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVideoType("short")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                    videoType === "short"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t('input.videoType.short')}
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType("regular")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                    videoType === "regular"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t('input.videoType.regular')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="video-url" className="text-sm font-medium text-foreground">
                {t('input.label')}
              </label>
              <div className="relative">
                <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="video-url"
                  type="url"
                  placeholder={t('input.placeholder')}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (error) setError("")
                  }}
                  className="pl-10 h-12 text-base rounded-xl border-border focus-visible:ring-primary"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            >
              {t('input.button')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Sample URLs */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
              {t('input.samples')}
            </p>
            <div className="flex flex-col gap-2">
              {DEFAULT_SAMPLE_SHORT_URLS.map((sample, idx) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setUrl(sample)}
                  className="text-left text-xs text-primary hover:text-primary/80 truncate font-mono transition-colors"
                >
                  {t(`input.sample${idx + 1}`)} · {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6">{t("input.footerNote")}</p>
      </div>
    </main>
  )
}
