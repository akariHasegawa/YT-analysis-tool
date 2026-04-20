"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabase } from "@/lib/supabase"

export function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState("ログイン処理中…")

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      setMessage("認可コードがありません。")
      router.replace("/")
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const supabase = createBrowserSupabase()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          setMessage(error.message)
          router.replace("/")
          return
        }
        router.replace("/")
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "エラーが発生しました")
          router.replace("/")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  )
}
