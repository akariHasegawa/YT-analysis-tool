"use client"

import { ArrowLeft, Chrome, Smartphone, Plus, BarChart2, Layers, ExternalLink } from "lucide-react"

const CHROME_STORE_URL = "https://chrome.google.com/webstore/detail/PLACEHOLDER"

const STEPS = [
  {
    num: 1,
    title: "Chrome拡張機能をインストール",
    desc: "下のボタンからChromeウェブストアでインストールします。",
    action: true,
  },
  {
    num: 2,
    title: "AIAI-shortにログイン",
    desc: "拡張機能アイコンをクリックし、同じアカウントでログインします。",
  },
  {
    num: 3,
    title: "TikTok・Instagramを開く",
    desc: "分析したい動画のページを開くと、画面右下にボタンが表示されます。",
  },
  {
    num: 4,
    title: "「分析する」ボタンをクリック",
    desc: "ボタンを押すと自動でAIAI-shortが開き、分析結果が表示されます。",
  },
]

const BUSINESS_STEPS = [
  {
    icon: Plus,
    title: "「＋ リストに追加」",
    desc: "動画ページで緑のボタンを押して最大5本をリストに追加。",
  },
  {
    icon: Layers,
    title: "「まとめて分析」",
    desc: "拡張機能のポップアップから「まとめて分析」をクリック。共通パターンを一括抽出。",
  },
]

interface ExtensionGuideScreenProps {
  onBack: () => void
  userPlan: "pro" | "business"
}

export function ExtensionGuideScreen({ onBack, userPlan }: ExtensionGuideScreenProps) {
  const isBusiness = userPlan === "business"

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="group mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[oklch(0.88_0.12_260)]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          戻る
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Chrome className="h-7 w-7 text-white" />
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            Chrome拡張機能のご案内
          </h1>
          <p className="text-sm text-muted-foreground">
            TikTok・Instagram動画をワンクリックで分析
          </p>
        </div>

        {/* Install button */}
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Chrome className="h-5 w-5" />
          Chrome拡張機能をインストール
          <ExternalLink className="h-4 w-4 opacity-70" />
        </a>

        {/* Steps */}
        <div className="mb-8 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">使い方</h2>
          {STEPS.map((step) => (
            <div key={step.num} className="glass-card flex gap-4 rounded-xl p-4">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {step.num}
              </div>
              <div>
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Business-only section */}
        {isBusiness && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#f59e0b" }}>
                Businessプラン限定
              </h2>
              <div className="h-px flex-1 bg-[oklch(0.82_0.16_75_/_0.3)]" />
            </div>
            <p className="text-sm text-muted-foreground">複数動画を一括分析して共通パターンを抽出できます。</p>
            {BUSINESS_STEPS.map((step, i) => (
              <div key={i} className="glass-card flex gap-4 rounded-xl p-4 border border-[oklch(0.82_0.16_75_/_0.2)]">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "oklch(0.82 0.16 75 / 0.15)" }}
                >
                  <step.icon className="h-4 w-4" style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
