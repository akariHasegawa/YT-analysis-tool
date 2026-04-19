"use client"

import { useLanguage } from "@/lib/language-context"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeroSectionProps {
  onGetStarted: () => void
}

// Advanced animated background with SVG and flowing orbs
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* SVG gradient mesh */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <defs>
          <radialGradient id="orb1" cx="50%" cy="50%" r="40%">
            <stop offset="0%" stopColor="oklch(0.75 0.25 250)" stopOpacity="0.6" />
            <stop offset="70%" stopColor="oklch(0.45 0.15 260)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="oklch(0.25 0.05 270)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb2" cx="50%" cy="50%" r="40%">
            <stop offset="0%" stopColor="oklch(0.72 0.22 290)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="oklch(0.40 0.12 300)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="oklch(0.20 0.04 310)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orb3" cx="50%" cy="50%" r="40%">
            <stop offset="0%" stopColor="oklch(0.70 0.20 270)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="oklch(0.38 0.10 280)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="oklch(0.18 0.03 290)" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="40" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Animated gradient circles - flowing motion */}
        <circle
          cx="20%"
          cy="30%"
          r="300"
          fill="url(#orb1)"
          filter="url(#glow)"
          className="animate-flowing-orb-1"
        />
        <circle
          cx="80%"
          cy="20%"
          r="280"
          fill="url(#orb2)"
          filter="url(#glow)"
          className="animate-flowing-orb-2"
        />
        <circle
          cx="50%"
          cy="80%"
          r="320"
          fill="url(#orb3)"
          filter="url(#glow)"
          className="animate-flowing-orb-3"
        />
      </svg>

      {/* Orbiting particles */}
      <div className="absolute left-1/4 top-1/3 h-48 w-48">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "absolute h-2 w-2 rounded-full",
              i === 0 && "animate-orbit-particle",
              i === 1 && "animate-orbit-particle-delayed-1",
              i === 2 && "animate-orbit-particle-delayed-2"
            )}
            style={{
              background: `oklch(${0.6 + i * 0.08} 0.18 ${240 + i * 30})`,
              boxShadow: `0 0 12px oklch(${0.6 + i * 0.08} 0.18 ${240 + i * 30} / 0.6)`,
              left: "50%",
              top: "50%",
              marginLeft: "-4px",
              marginTop: "-4px",
            }}
          />
        ))}
      </div>

      {/* Secondary orbiting particles on right side */}
      <div className="absolute right-1/4 top-1/2 h-40 w-40">
        {[0, 1, 2].map((i) => (
          <div
            key={`right-${i}`}
            className={cn(
              "absolute h-1.5 w-1.5 rounded-full",
              i === 0 && "animate-orbit-particle",
              i === 1 && "animate-orbit-particle-delayed-1",
              i === 2 && "animate-orbit-particle-delayed-2"
            )}
            style={{
              background: `oklch(${0.55 + i * 0.07} 0.16 ${280 + i * 25})`,
              boxShadow: `0 0 10px oklch(${0.55 + i * 0.07} 0.16 ${280 + i * 25} / 0.5)`,
              left: "50%",
              top: "50%",
              marginLeft: "-3px",
              marginTop: "-3px",
            }}
          />
        ))}
      </div>

      {/* Grid overlay - subtle */}
      <div className="absolute inset-0 neon-grid opacity-20" />

      {/* Gradient overlay to blend edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[oklch(0.11_0.05_278)]" />
    </div>
  )
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { t } = useLanguage()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Advanced animated background */}
      <AnimatedBackground />

      {/* Content container with relative positioning */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-32 sm:gap-6">
        {/* Badge */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.5_0.12_270_/_0.3)] bg-[oklch(0.18_0.06_280_/_0.4)] px-4 py-1.5 text-sm font-medium text-[oklch(0.78_0.14_260)]">
            <div className="h-2 w-2 rounded-full bg-[oklch(0.72_0.2_250)] animate-pulse" />
            {t("hero.badge")}
          </div>
        </div>

        {/* Main headline - gradient text */}
        <div className="animate-fade-up-delay-1 space-y-1 text-center">
          <h1 className="font-display text-3xl font-bold leading-snug tracking-tight sm:text-4xl md:text-5xl">
            <span className="text-[oklch(0.88_0.16_250)]">{t("hero.title.line1")}</span>
            <br />
            <span className="text-[oklch(0.88_0.16_250)]">{t("hero.title.line2")}</span>
          </h1>
        </div>

        {/* Subheadline */}
        <p className="animate-fade-up-delay-2 text-center text-base font-semibold text-[oklch(0.72_0.18_280)] sm:text-lg">
          {t("hero.subheadline")}
        </p>

        {/* CTA Button with pulse glow */}
        <button
          type="button"
          onClick={onGetStarted}
          className="animate-fade-up-delay-3 neon-button group relative mt-4 rounded-xl px-6 py-3 text-base font-semibold transition-all duration-300 sm:mt-6 sm:px-8 sm:py-4"
        >
          <span className="flex items-center gap-2">
            {t("hero.cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>

        <p className="animate-fade-up-delay-4 text-xs text-[oklch(0.65_0.08_270)] sm:text-sm">
          {t("hero.ctaNote")}
        </p>
      </div>

      {/* Stats section - absolute bottom positioning */}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center px-4">
        <div className="grid grid-cols-3 gap-6 sm:gap-12">
          <div className="text-center">
            <div className="text-xl font-bold text-[oklch(0.82_0.16_250)] sm:text-2xl">12,400+</div>
            <div className="text-xs text-[oklch(0.65_0.08_270)]">{t("hero.stat1.label")}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[oklch(0.82_0.16_250)] sm:text-2xl">4</div>
            <div className="text-xs text-[oklch(0.65_0.08_270)]">{t("hero.stat2.label")}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[oklch(0.82_0.16_250)] sm:text-2xl">2</div>
            <div className="text-xs text-[oklch(0.65_0.08_270)]">{t("hero.stat3.label")}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
