"use client"

import { useLanguage } from "@/lib/language-context"
import { Search, Rocket, ArrowLeft, Layers, Lock, Chrome } from "lucide-react"
import { cn } from "@/lib/utils"

export type AnalysisMode = "buzz" | "growth" | "multi"

interface ModeSelectionProps {
  onSelectMode: (mode: AnalysisMode) => void
  onBack: () => void
  onExtensionGuide?: () => void
  userPlan?: "free" | "pro" | "business"
  remainingAnalyses?: number
  maxAnalyses?: number
}

const MODES = [
  {
    id: "buzz" as const,
    icon: Search,
    accentFrom: "oklch(0.65 0.18 195)", // cyan
    accentTo: "oklch(0.58 0.2 250)",    // blue
    borderHover: "oklch(0.6 0.18 220 / 0.5)",
    bgHover: "oklch(0.18 0.06 220 / 0.4)",
    titleKey: "mode.buzz.title",
    titleFallback: "バズ分析",
    descKey: "mode.buzz.desc",
    descFallback: "バズった動画のURLを入力 → なぜ伸びたか構造的に分析",
    tags: [
      { key: "mode.buzz.tag1", fallback: "構造分析" },
      { key: "mode.buzz.tag2", fallback: "フック解説" },
      { key: "mode.buzz.tag3", fallback: "感情設計" },
      { key: "mode.buzz.tag4", fallback: "参考事例化" },
    ],
  },
  {
    id: "growth" as const,
    icon: Rocket,
    accentFrom: "oklch(0.72 0.18 85)",  // amber
    accentTo: "oklch(0.62 0.22 30)",    // red
    borderHover: "oklch(0.65 0.18 55 / 0.5)",
    bgHover: "oklch(0.2 0.08 55 / 0.35)",
    titleKey: "mode.growth.title",
    titleFallback: "Growth",
    descKey: "mode.growth.desc",
    descFallback: "あなたの動画を伸ばす設計を",
    tags: [
      { key: "mode.growth.tag1", fallback: "改善提案" },
      { key: "mode.growth.tag2", fallback: "競合比較" },
      { key: "mode.growth.tag3", fallback: "次回作アイデア" },
      { key: "mode.growth.tag4", fallback: "台本プロンプト" },
    ],
  },
]

const PLAN_CONFIG = {
  free:     { label: "無料プラン",     color: "#9ca3af" },
  pro:      { label: "Pro プラン",     color: "#6366f1" },
  business: { label: "Business プラン", color: "#f59e0b" },
}

export function ModeSelection({ onSelectMode, onBack, onExtensionGuide, userPlan = "free", remainingAnalyses, maxAnalyses }: ModeSelectionProps) {
  const { t } = useLanguage()
  const isPaid = userPlan === "pro" || userPlan === "business"
  const isBusiness = userPlan === "business"
  const plan = PLAN_CONFIG[userPlan]

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-xl">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="group mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[oklch(0.88_0.12_260)]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          {t("mode.back") || "戻る"}
        </button>

        {/* Extension guide button (Pro/Business only) */}
        {isPaid && onExtensionGuide && (
          <button
            type="button"
            onClick={onExtensionGuide}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[oklch(0.45_0.1_270_/_0.25)] py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-[oklch(0.55_0.15_270_/_0.4)] hover:text-foreground"
          >
            <Chrome className="h-4 w-4" />
            Chrome拡張機能のご案内（TikTok・Instagram対応）
          </button>
        )}

        {/* Plan badge */}
        {isPaid && (
          <div className="mb-6 flex items-center justify-center">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{
                background: `${plan.color}18`,
                border: `1px solid ${plan.color}40`,
                color: plan.color,
              }}
            >
              <span>{plan.label}</span>
              {remainingAnalyses != null && maxAnalyses != null && (
                <>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span>残り {remainingAnalyses} / {maxAnalyses} 回</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Section header */}
        <div className="mb-10 text-center animate-fade-up">
          <h1 className="mb-3 font-display text-xl font-bold text-foreground sm:text-2xl">
            {t("mode.heading") || "分析モードを選択"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("mode.subheading") || "目的に合わせてモードを選んでください"}
          </p>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-5">
          {MODES.map((mode, idx) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className={cn(
                "group relative flex flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-300 sm:p-8",
                "glass-card mode-card-glow",
                "border-[oklch(0.45_0.1_270_/_0.25)]",
                idx === 0 ? "animate-fade-up-delay-1" : "animate-fade-up-delay-2"
              )}
              style={{
                // @ts-expect-error CSS custom properties
                "--hover-border": mode.borderHover,
                "--hover-bg": mode.bgHover,
              }}
            >
              {/* Icon with gradient background */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${mode.accentFrom}, ${mode.accentTo})`,
                }}
              >
                <mode.icon className="h-6 w-6 text-white" />
              </div>

              {/* Title & description */}
              <div className="flex flex-col gap-2">
                <h2
                  className="font-display text-lg font-bold sm:text-xl"
                  style={{
                    background: `linear-gradient(90deg, ${mode.accentFrom}, ${mode.accentTo})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {t(mode.titleKey) || mode.titleFallback}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(mode.descKey) || mode.descFallback}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {mode.tags.map((tag) => (
                  <span
                    key={tag.key}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${mode.accentFrom}20, ${mode.accentTo}15)`,
                      color: mode.accentFrom,
                      border: `1px solid ${mode.accentFrom}30`,
                    }}
                  >
                    {t(tag.key) || tag.fallback}
                  </span>
                ))}
              </div>

              {/* Hover indicator */}
              <div
                className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${mode.accentFrom}, ${mode.accentTo})`,
                  }}
                >
                  <span className="text-white text-lg">→</span>
                </div>
              </div>
            </button>
          ))}

          {/* Multi-video analysis card (Business only) */}
          <button
            type="button"
            onClick={() => isBusiness ? onSelectMode("multi") : undefined}
            disabled={!isBusiness}
            className={cn(
              "group relative flex flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-300 sm:p-8",
              "glass-card animate-fade-up-delay-3",
              isBusiness
                ? "border-[oklch(0.45_0.1_270_/_0.25)] cursor-pointer"
                : "border-[oklch(0.35_0.06_270_/_0.2)] cursor-default opacity-70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: isBusiness
                    ? "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))"
                    : "oklch(0.25 0.06 270 / 0.5)",
                }}
              >
                {isBusiness ? (
                  <Layers className="h-6 w-6 text-white" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: "oklch(0.82 0.16 75 / 0.15)",
                  border: "1px solid oklch(0.82 0.16 75 / 0.4)",
                  color: "oklch(0.82 0.16 75)",
                }}
              >
                Business 専用
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h2
                className="font-display text-lg font-bold sm:text-xl"
                style={{
                  background: isBusiness
                    ? "linear-gradient(90deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))"
                    : "none",
                  WebkitBackgroundClip: isBusiness ? "text" : "unset",
                  backgroundClip: isBusiness ? "text" : "unset",
                  color: isBusiness ? "transparent" : "oklch(0.6 0.08 270)",
                }}
              >
                複数動画の共通点分析
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isBusiness
                  ? "2〜5本のURLを入力 → 共通パターンと成功要因を一括抽出"
                  : "Businessプランにアップグレードすると利用できます"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["共通フック抽出", "成功要因TOP5", "次回作アイデア", "台本プロンプト"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: isBusiness
                      ? "oklch(0.72 0.18 85 / 0.15)"
                      : "oklch(0.2 0.04 270 / 0.4)",
                    color: isBusiness ? "oklch(0.72 0.18 85)" : "oklch(0.5 0.06 270)",
                    border: `1px solid ${isBusiness ? "oklch(0.72 0.18 85 / 0.3)" : "oklch(0.35 0.06 270 / 0.2)"}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {isBusiness && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))" }}
                >
                  <span className="text-white text-lg">→</span>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
