"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { ExtensionInstallModal } from "@/components/extension-install-modal"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { session, isLoading } = useSupabaseAuth()
  const [showExtensionModal, setShowExtensionModal] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (searchParams.get("checkout") !== "success") return
    if (!session?.access_token) return

    fetch("/api/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.plan === "business") {
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
