"use client"

import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { X, Check, Sparkles, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

export type PlanType = "free" | "pro" | "business"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: PlanType
  targetPlan: PlanType
  onUpgrade: (plan: PlanType) => void
}

const PLANS = {
  free: {
    name: "初回無料",
    price: "¥0",
    period: "",
    limit: "1回",
    features: [
      "動画情報・構造分析",
      "サムネ評価",
      "基本改善提案",
    ],
  },
  pro: {
    name: "Pro",
    price: "¥3,980",
    period: "/月",
    limit: "月30回",
    features: [
      "動画情報・構造分析",
      "サムネ評価",
      "秒単位の改善提案",
      "次の動画アイデア4つ",
      "台本・動画プロンプト生成",
    ],
  },
  business: {
    name: "Business",
    price: "¥12,800",
    period: "/月",
    limit: "月100回",
    features: [
      "Proプランの全機能",
      "複数動画の共通点分析",
      "競合比較分析",
      "レポート自動生成",
      "音声変換機能",
    ],
  },
}

export function UpgradeModal({ isOpen, onClose, currentPlan, targetPlan, onUpgrade }: UpgradeModalProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  const current = PLANS[currentPlan]
  const target = PLANS[targetPlan]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[oklch(0.08_0.04_280_/_0.85)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[oklch(0.3_0.08_270_/_0.4)] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.18_85)] to-[oklch(0.62_0.22_30)]">
                <Crown className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl">
              {t("upgrade.title") || "プランをアップグレード"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("upgrade.subtitle") || "より多くの機能にアクセス"}
            </p>
          </div>

          {/* Plan comparison */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            {/* Current plan */}
            <div className="rounded-xl border border-[oklch(0.45_0.1_270_/_0.3)] bg-[oklch(0.14_0.04_280_/_0.5)] p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("upgrade.current") || "現在のプラン"}
              </p>
              <h3 className="mb-2 text-lg font-bold text-foreground">{current.name}</h3>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{current.price}</span>
                <span className="text-sm text-muted-foreground">{current.period}</span>
              </div>
              <p className="text-xs text-muted-foreground">{current.limit}</p>
            </div>

            {/* Target plan */}
            <div 
              className="rounded-xl p-4 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, oklch(0.25 0.1 85 / 0.4), oklch(0.2 0.08 60 / 0.3))",
                border: "1px solid oklch(0.6 0.15 70 / 0.4)",
              }}
            >
              <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[oklch(0.7_0.18_80_/_0.2)] blur-xl" />
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[oklch(0.8_0.14_75)]">
                {t("upgrade.target") || "アップグレード先"}
              </p>
              <h3 className="mb-2 text-lg font-bold text-foreground flex items-center gap-2">
                {target.name}
                <Sparkles className="h-4 w-4 text-[oklch(0.78_0.16_70)]" />
              </h3>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">{target.price}</span>
                <span className="text-sm text-muted-foreground">{target.period}</span>
              </div>
              <p className="text-xs text-[oklch(0.75_0.12_75)]">{target.limit}</p>
            </div>
          </div>

          {/* Features list */}
          <div className="mb-8 rounded-xl bg-[oklch(0.14_0.04_280_/_0.5)] p-4 border border-[oklch(0.4_0.08_270_/_0.2)]">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("upgrade.features") || "含まれる機能"}
            </p>
            <ul className="space-y-2">
              {target.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
                  <Check className="h-4 w-4 flex-shrink-0 text-[oklch(0.72_0.18_160)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade button */}
          <Button
            type="button"
            onClick={() => onUpgrade(targetPlan)}
            className={cn(
              "h-12 w-full rounded-xl border-0 text-base font-semibold text-white transition-all",
              "bg-gradient-to-r from-[oklch(0.68_0.18_75)] to-[oklch(0.58_0.2_35)]",
              "hover:shadow-[0_8px_32px_oklch(0.6_0.18_60_/_0.4)] hover:-translate-y-0.5"
            )}
          >
            {t("upgrade.button") || "アップグレードする"}
          </Button>

          {/* Note */}
          <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
            {t("upgrade.note") || "いつでもキャンセル可能です。Stripeで安全に決済されます。"}
          </p>
        </div>
      </div>
    </div>
  )
}
