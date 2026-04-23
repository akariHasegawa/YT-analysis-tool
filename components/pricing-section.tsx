'use client'

import { Check } from 'lucide-react'

interface PricingProps {
  onPlanSelect: (plan: string) => void
}

export function PricingSection({ onPlanSelect }: PricingProps) {
  return (
    <section id="pricing" className="flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6366f1]">PRICING</div>
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">シンプルな料金プラン</h2>
        <p className="mt-3 text-sm text-gray-400 sm:text-base">
          まず無料で試して、必要になったらアップグレード。
        </p>
      </div>

      {/* Pricing Cards Container */}
      <div className="relative w-full max-w-6xl">
        {/* PC: centered flex / Mobile: horizontal scroll */}
        <div className="flex gap-6 overflow-x-auto pb-2 sm:justify-center sm:overflow-x-visible sm:pb-0">

          {/* FREE Card */}
          <div className="w-[80vw] max-w-sm flex-shrink-0 rounded-2xl border border-gray-600 bg-[#0f1117] p-8 sm:w-full">
            <div className="mb-4 inline-block rounded-lg bg-gray-700 px-3 py-1 text-xs font-bold text-gray-200">
              FREE
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-white">¥0</div>
              <div className="text-sm text-gray-400">初回1回限り</div>
            </div>

            {/* Features */}
            <div className="mb-8 space-y-3">
              <FeatureItem text="バズ分析 or バズりたい（1回）" />
              <FeatureItem text="AI構造分析" />
              <FeatureItem text="サムネ評価" />
            </div>

            <button
              onClick={() => onPlanSelect('free')}
              className="w-full rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 transition-colors hover:bg-gray-900"
            >
              無料で試す
            </button>
          </div>

          {/* PRO Card */}
          <div className="w-[80vw] max-w-sm flex-shrink-0 rounded-2xl border-2 border-[#6366f1] bg-gradient-to-br from-[#0f1117] to-[#1e1a4f] p-8 sm:w-full">
            <div className="mb-4 inline-block rounded-lg bg-[#6366f1] px-3 py-1 text-xs font-bold text-white">
              PRO
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-white">¥3,980<span className="text-lg font-normal text-gray-400"> / 月</span></div>
              <div className="text-sm text-gray-400">月30回まで分析可能</div>
            </div>

            {/* Features */}
            <div className="mb-8 space-y-2">
              <FeatureItem text="バズ分析" />
              <FeatureItem text="バズり動画 vs 自分の動画の比較分析" />
              <FeatureItem text="比較結果から台本・動画生成プロンプトを生成" />
              <FeatureItem text="秒単位の改善提案" />
              <FeatureItem text="次の動画アイデア4つ" />
              <FeatureItem text="台本・動画生成プロンプト（4パターン）" />
            </div>

            <button
              onClick={() => onPlanSelect('pro')}
              className="w-full rounded-lg bg-gradient-to-r from-[#4c1d95] to-[#6d28d9] px-4 py-2 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)]"
            >
              Proを始める
            </button>
          </div>

          {/* BUSINESS Card */}
          <div className="w-[80vw] max-w-sm flex-shrink-0 rounded-2xl border border-[#f59e0b] bg-gradient-to-br from-[#0f1117] to-[#4f2a0f] p-8 sm:w-full">
            <div className="mb-4 inline-block rounded-lg bg-[#f59e0b] px-3 py-1 text-xs font-bold text-black">
              BUSINESS
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold text-white">¥14,800<span className="text-lg font-normal text-gray-400"> / 月</span></div>
              <div className="text-sm text-gray-400">月100回分析可能</div>
              <div className="mt-1 text-xs text-gray-400">※最大5本の同時分析も1回としてカウント</div>
            </div>

            {/* Features */}
            <div className="mb-8 space-y-3 text-sm text-gray-300">
              <div className="rounded-lg bg-[rgba(99,102,241,0.1)] p-3">
                <div className="font-semibold text-white">Pro全機能含む</div>
                <div className="text-xs text-gray-400 mt-1">バズ分析・比較分析・プロンプト生成など全て利用可能。</div>
              </div>
              <div className="rounded-lg bg-[rgba(99,102,241,0.1)] p-3">
                <div className="font-semibold text-white">複数動画からバズの共通パターンを抽出</div>
                <div className="text-xs text-gray-400 mt-1">最大5本を同時分析。再現性のある勝ちパターンを特定。</div>
              </div>
              <div className="rounded-lg bg-[rgba(99,102,241,0.1)] p-3">
                <div className="font-semibold text-white">内部用・クライアント提出用を自動で出し分け</div>
                <div className="text-xs text-gray-400 mt-1">ボタン一つでプロ品質のレポートを即生成。</div>
              </div>
              <div className="rounded-lg bg-[rgba(99,102,241,0.1)] p-3">
                <div className="font-semibold text-white">動画制作まで進められるナレーション生成</div>
                <div className="text-xs text-gray-400 mt-1">台本をそのまま高品質な日本語音声に変換。</div>
              </div>
            </div>

            <button
              onClick={() => onPlanSelect('business')}
              className="w-full rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#ef4444] px-4 py-2 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(245,158,11,0.4)]"
            >
              Businessを始める
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="h-5 w-5 flex-shrink-0 text-[#6366f1] mt-0.5" />
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  )
}
