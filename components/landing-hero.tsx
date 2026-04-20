'use client'

import { ArrowRight } from 'lucide-react'

interface LandingHeroProps {
  onGetStarted: () => void
}

export function LandingHero({ onGetStarted }: LandingHeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 py-20 sm:py-32">
      {/* Badge */}
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.05)] px-4 py-1.5">
        <div className="h-2 w-2 rounded-full bg-[#6366f1] animate-pulse" />
        <span className="text-sm font-medium text-[#6366f1]">AI動画構造分析</span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display max-w-4xl text-center text-2xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
        <span className="whitespace-nowrap text-white">なぜあの動画は伸びて、</span>
        <br />
        <span className="whitespace-nowrap bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
          あなたの動画は伸びないのか。
        </span>
      </h1>

      {/* Subheadline */}
      <div className="mt-6 space-y-1 text-center text-gray-400">
        <p className="text-base sm:text-lg">センスより、構造。</p>
        <p className="text-base sm:text-lg">分析で終わらない。伸ばすための設計まで。</p>
      </div>

      {/* CTA Button */}
      <button
        onClick={onGetStarted}
        className="group mt-8 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-8 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)]"
      >
        すぐに分析してみる
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>

      {/* CTA Note */}
      <p className="mt-3 text-xs text-white sm:text-sm">初回1回無料</p>

      {/* Mode Badges */}
      <div className="mt-12 flex gap-0 rounded-lg overflow-hidden">
        {/* Research Mode */}
        <div className="flex-1 border border-r-0 border-[#6366f1] rounded-l-lg bg-transparent px-4 py-4 sm:px-8 sm:py-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6366f1]">Research</div>
          <p className="text-sm text-gray-300 sm:text-base sm:whitespace-nowrap">
            <span className="sm:hidden">バズ動画の構造を<br />読み解く</span>
            <span className="hidden sm:inline">バズ動画の構造を読み解く</span>
          </p>
        </div>

        {/* Growth Mode */}
        <div className="flex-1 border border-l-0 border-[#f59e0b] rounded-r-lg bg-transparent px-4 py-4 sm:px-8 sm:py-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f59e0b]">Growth</div>
          <p className="text-sm text-gray-300 sm:text-base sm:whitespace-nowrap">
            <span className="sm:hidden">あなたの動画を<br />伸ばす設計を</span>
            <span className="hidden sm:inline">あなたの動画を伸ばす設計を</span>
          </p>
        </div>
      </div>
    </section>
  )
}
