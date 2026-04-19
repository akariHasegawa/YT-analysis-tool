"use client"

import { useLanguage } from "@/lib/language-context"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeroSectionProps {
  onGetStarted: () => void
}

// Floating particles for background decoration
function FloatingParticles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 6,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `oklch(0.65 0.2 ${260 + Math.random() * 40} / ${0.3 + Math.random() * 0.4})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// Sample video thumbnails for the flowing cards
const SAMPLE_THUMBNAILS = [
  { title: "Short 1", views: "1.2M" },
  { title: "Short 2", views: "890K" },
  { title: "Short 3", views: "2.1M" },
  { title: "Short 4", views: "450K" },
  { title: "Short 5", views: "3.4M" },
  { title: "Short 6", views: "780K" },
]

// Flowing video cards background
function FlowingVideoCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.28]">
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ transform: "translate(-50%, -50%) rotate(-3deg)" }}
      >
        {/* Row 1 - scrolling left */}
        <div className="mb-4 flex gap-4 animate-scroll-left">
          {[...SAMPLE_THUMBNAILS, ...SAMPLE_THUMBNAILS].map((thumb, i) => (
            <div
              key={`row1-${i}`}
              className="h-36 w-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-[oklch(0.25_0.08_270)] to-[oklch(0.18_0.06_280)] border border-[oklch(0.4_0.1_270_/_0.3)]"
            />
          ))}
        </div>
        {/* Row 2 - scrolling right */}
        <div className="mb-4 flex gap-4 animate-scroll-right">
          {[...SAMPLE_THUMBNAILS, ...SAMPLE_THUMBNAILS].map((thumb, i) => (
            <div
              key={`row2-${i}`}
              className="h-36 w-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-[oklch(0.22_0.08_280)] to-[oklch(0.16_0.06_290)] border border-[oklch(0.4_0.1_280_/_0.3)]"
            />
          ))}
        </div>
        {/* Row 3 - scrolling left */}
        <div className="flex gap-4 animate-scroll-left-slow">
          {[...SAMPLE_THUMBNAILS, ...SAMPLE_THUMBNAILS].map((thumb, i) => (
            <div
              key={`row3-${i}`}
              className="h-36 w-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-[oklch(0.24_0.08_275)] to-[oklch(0.17_0.06_285)] border border-[oklch(0.4_0.1_275_/_0.3)]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { t } = useLanguage()

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-8">
      {/* Background layers */}
      <FloatingParticles />
      <FlowingVideoCards />
      
      {/* Center gradient overlay for text readability */}
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, oklch(0.08 0.04 280 / 0.95) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Badge */}
        <div className="animate-fade-up mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.55_0.18_270_/_0.4)] bg-[oklch(0.18_0.08_280_/_0.6)] px-4 py-2 text-xs font-medium tracking-wide text-[oklch(0.82_0.14_265)] backdrop-blur-sm sm:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.65_0.2_270)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.18_265)]" />
            </span>
            {t("hero.badge") || "AI動画構造分析"}
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-up-delay-1 mb-6 font-display text-2xl font-bold leading-[1.35] tracking-tight sm:text-[27px] md:text-3xl">
          <span className="block text-foreground">{t("hero.title.line1") || "なぜあの動画は伸びて、"}</span>
          <span 
            className="mt-1 block"
            style={{
              background: "linear-gradient(90deg, oklch(0.72 0.16 250), oklch(0.75 0.2 290))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {t("hero.title.line2") || "あなたの動画は伸びないのか。"}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up-delay-2 mb-10 text-sm text-muted-foreground sm:text-[15px]">
          {t("hero.subheadline") || "感覚でやめて、構造で作れ。"}
        </p>

        {/* CTA Button */}
        <div className="animate-fade-up-delay-3 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onGetStarted}
            className={cn(
              "group relative flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all",
              "bg-gradient-to-r from-[oklch(0.55_0.2_260)] to-[oklch(0.52_0.22_285)]",
              "hover:shadow-[0_8px_32px_oklch(0.5_0.2_270_/_0.4)] hover:-translate-y-0.5",
              "animate-pulse-glow"
            )}
          >
            {t("hero.cta") || "無料で分析してみる"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="text-[11px] text-white/70">
            {t("hero.ctaNote") || "初回1回無料"}
          </span>
        </div>

        {/* Stats */}
        <div className="animate-fade-up-delay-4 mt-16 flex items-center gap-6 sm:gap-10">
          <StatItem 
            value="12,400+" 
            label={t("hero.stat1.label") || "分析動画数"} 
          />
          <div className="h-10 w-px bg-[oklch(0.5_0.1_270_/_0.3)]" />
          <StatItem 
            value="4" 
            label={t("hero.stat2.label") || "プロンプト生成"} 
            suffix={t("hero.stat2.suffix") || "パターン"}
          />
          <div className="h-10 w-px bg-[oklch(0.5_0.1_270_/_0.3)]" />
          <StatItem 
            value="2" 
            label={t("hero.stat3.label") || "対応モード"} 
            suffix={t("hero.stat3.suffix") || "種類"}
          />
        </div>
      </div>
    </main>
  )
}

function StatItem({ 
  value, 
  label, 
  suffix 
}: { 
  value: string
  label: string
  suffix?: string 
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-xl font-bold text-foreground sm:text-2xl">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <span className="text-[10px] text-muted-foreground sm:text-xs">{label}</span>
    </div>
  )
}
