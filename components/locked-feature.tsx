"use client"

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PlanType } from "./upgrade-modal"

interface LockedFeatureProps {
  children: React.ReactNode
  isLocked: boolean
  requiredPlan: PlanType
  onUpgradeClick: (plan: PlanType) => void
  className?: string
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: "無料",
  pro: "Pro",
  business: "Business",
}

export function LockedFeature({ 
  children, 
  isLocked, 
  requiredPlan, 
  onUpgradeClick,
  className 
}: LockedFeatureProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred/grayed out content */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onUpgradeClick(requiredPlan)}
          className={cn(
            "group flex flex-col items-center gap-3 rounded-xl px-6 py-4 transition-all",
            "bg-[oklch(0.12_0.05_280_/_0.8)] backdrop-blur-sm",
            "border border-[oklch(0.5_0.1_270_/_0.3)]",
            "hover:bg-[oklch(0.16_0.06_275_/_0.85)] hover:border-[oklch(0.6_0.14_265_/_0.4)]",
            "hover:shadow-[0_0_24px_oklch(0.5_0.15_270_/_0.2)]"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.25_0.08_270_/_0.6)]">
            <Lock className="h-5 w-5 text-[oklch(0.72_0.14_260)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {PLAN_LABELS[requiredPlan]}プラン以上で利用可能
            </p>
            <p className="mt-1 text-xs text-[oklch(0.72_0.16_260)] group-hover:text-[oklch(0.82_0.16_255)]">
              クリックしてアップグレード
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

// Plan badge component for showing remaining analyses
interface PlanBadgeProps {
  plan: PlanType
  remainingAnalyses: number
  maxAnalyses: number
}

export function PlanBadge({ plan, remainingAnalyses, maxAnalyses }: PlanBadgeProps) {
  const planColors: Record<PlanType, { bg: string; text: string; border: string }> = {
    free: {
      bg: "oklch(0.22 0.06 270 / 0.5)",
      text: "oklch(0.75 0.12 265)",
      border: "oklch(0.5 0.1 270 / 0.3)",
    },
    pro: {
      bg: "oklch(0.22 0.08 260 / 0.5)",
      text: "oklch(0.78 0.16 255)",
      border: "oklch(0.55 0.14 260 / 0.4)",
    },
    business: {
      bg: "oklch(0.24 0.1 80 / 0.4)",
      text: "oklch(0.82 0.16 75)",
      border: "oklch(0.6 0.14 80 / 0.4)",
    },
  }

  const colors = planColors[plan]

  return (
    <div 
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span 
        className="text-xs font-semibold"
        style={{ color: colors.text }}
      >
        {PLAN_LABELS[plan]}
      </span>
      <span className="h-1 w-1 rounded-full bg-current opacity-40" />
      <span className="text-xs" style={{ color: colors.text }}>
        残り {remainingAnalyses}/{maxAnalyses} 回
      </span>
    </div>
  )
}
