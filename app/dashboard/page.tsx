"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Chrome, ExternalLink } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { ExtensionInstallModal } from "@/components/extension-install-modal"

const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/aiai-short-%E5%88%86%E6%9E%90%E3%83%84%E3%83%BC%E3%83%AB/caeiojejmcmbiapdldioggomofdigaij"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { session, isLoading } = useSupabaseAuth()
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading || !session?.access_token) return

    fetch("/api/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setPlan(data.plan)
        // チェックアウト直後かつBusinessプランならモーダル表示
        if (data.plan === "business" && searchParams.get("checkout") === "success") {
          setShowExtensionModal(true)
        }
      })
      .catch(() => {})
  }, [isLoading, session, searchParams])

  return (
    <>
      {showExtensionModal && (
        <ExtensionInstallModal onClose={() => setShowExtensionModal(false)} />
      )}
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
        <p className="mt-4 text-sm text-gray-300">
          決済が完了した場合、プランは自動で更新されます。反映まで数十秒かかることがあります。
        </p>

        {/* Business プラン向け拡張機能バナー */}
        {plan === "business" && (
          <div className="mt-10 w-full rounded-2xl border border-[#6366f1]/40 bg-gradient-to-br from-[#0f1117] to-[#1e1a4f] p-6 text-left">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6366f1]">
              Business プラン特典
            </div>
            <div className="mb-3 flex items-center gap-2">
              <Chrome className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold text-white">Chrome拡張機能</h2>
            </div>
            <p className="mb-4 text-sm text-gray-400">
              TikTok・Instagramを見ながら最大5本まとめて分析できます。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a78bfa] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)]"
              >
                <Chrome className="h-4 w-4" />
                インストール
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <a
                href="/extension"
                className="flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-gray-300 transition-all hover:border-white/40 hover:text-white"
              >
                使い方を見る
              </a>
            </div>
          </div>
        )}

        <a
          href="/"
          className="mt-8 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-5 py-2 text-sm font-semibold text-white"
        >
          TOPへ戻る
        </a>
      </main>
    </>
  )
}
