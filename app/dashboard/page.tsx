"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

type PlanType = "pro" | "business"
type AnalysisMode = "buzz" | "growth"

const PLAN_CONFIG: Record<PlanType, { label: string; color: string; bg: string; border: string; maxAnalyses: number }> = {
  pro:      { label: "Pro",      color: "#6366f1", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.3)", maxAnalyses: 30  },
  business: { label: "Business", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)", maxAnalyses: 100 },
}

interface DashboardPageProps {
  searchParams: Promise<{ plan?: string }>
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  // For demo purposes, get plan from URL query param (?plan=pro or ?plan=business)
  // In production, this would come from auth/database
  const [plan, setPlan] = useState<PlanType>("pro")
  const [remainingAnalyses, setRemainingAnalyses] = useState(28)

  // Update plan from URL on mount
  useState(() => {
    searchParams.then((params) => {
      if (params.plan === "business") {
        setPlan("business")
        setRemainingAnalyses(98)
      } else {
        setPlan("pro")
        setRemainingAnalyses(28)
      }
    })
  })

  const config = PLAN_CONFIG[plan]

  const handleSelectMode = (mode: AnalysisMode) => {
    // In production, this would navigate to the analysis flow
    console.log("Selected mode:", mode)
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-[#060810] px-4 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-xl">

        {/* Plan Status Bar */}
        <div
          className="mb-6 flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ background: config.bg, borderColor: config.border }}
        >
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ color: config.color, background: config.border }}
            >
              {config.label}
            </span>
            <span className="text-sm text-gray-300">プラン</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: config.color }}>
              残り {remainingAnalyses} / {config.maxAnalyses} 回
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">分析モードを選択</h1>
          <p className="mt-2 text-sm text-gray-400">目的に合わせたモードで分析を始めましょう</p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Research Mode */}
          <button
            onClick={() => handleSelectMode("buzz")}
            className="group relative overflow-hidden rounded-2xl border border-[#6366f1] bg-[#0f1117] p-6 text-left transition-all hover:border-[#818cf8] hover:shadow-lg hover:shadow-[rgba(99,102,241,0.2)]"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#6366f1]">Research</div>
            <h3 className="text-lg font-semibold text-white">バズ動画の構造を読み解く</h3>
            <p className="mt-2 text-sm text-gray-400">他のバズ動画を分析して、成功の構造を理解する</p>
          </button>

          {/* Growth Mode */}
          <button
            onClick={() => handleSelectMode("growth")}
            className="group relative overflow-hidden rounded-2xl border border-[#f59e0b] bg-[#0f1117] p-6 text-left transition-all hover:border-[#fbbf24] hover:shadow-lg hover:shadow-[rgba(245,158,11,0.2)]"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#f59e0b]">Growth</div>
            <h3 className="text-lg font-semibold text-white">あなたの動画を伸ばす設計を</h3>
            <p className="mt-2 text-sm text-gray-400">自分の動画を分析して、改善点と次の動画を提案</p>
          </button>
        </div>

        {/* Plan Switch (for demo) */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => { setPlan("pro"); setRemainingAnalyses(28) }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              plan === "pro" 
                ? "bg-[#6366f1] text-white" 
                : "border border-gray-600 text-gray-400 hover:border-[#6366f1] hover:text-white"
            }`}
          >
            Pro プラン
          </button>
          <button
            onClick={() => { setPlan("business"); setRemainingAnalyses(98) }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              plan === "business" 
                ? "bg-[#f59e0b] text-white" 
                : "border border-gray-600 text-gray-400 hover:border-[#f59e0b] hover:text-white"
            }`}
          >
            Business プラン
          </button>
        </div>

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            TOPに戻る
          </Link>
        </div>

      </div>
    </main>
  )
}
