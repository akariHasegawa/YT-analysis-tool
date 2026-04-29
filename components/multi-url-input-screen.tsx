"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Trash2, Loader2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { detectPlatform } from "@/lib/platforms/types"
import { cn } from "@/lib/utils"
import type { MultiVideoAnalysis } from "@/lib/multi-video-analysis"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

interface MultiUrlInputScreenProps {
  onBack: () => void
  onResults: (analysis: MultiVideoAnalysis, urls: string[]) => void
  isLoading?: boolean
}

export function MultiUrlInputScreen({ onBack, onResults, isLoading = false }: MultiUrlInputScreenProps) {
  const { session } = useSupabaseAuth()
  const [urls, setUrls] = useState<string[]>(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const setUrl = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
    setError(undefined)
  }

  const addUrl = () => {
    if (urls.length < 5) setUrls((prev) => [...prev, ""])
  }

  const removeUrl = (index: number) => {
    if (urls.length <= 2) return
    setUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const filledUrls = urls.filter((u) => u.trim().length > 0)

  const validate = (): string | null => {
    if (filledUrls.length < 2) return "URLを2本以上入力してください"
    for (const u of filledUrls) {
      if (!detectPlatform(u.trim())) return `対応していないURLが含まれています:\n${u.trim()}`
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const res = await fetch("/api/analyze-multi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ urls: filledUrls.map((u) => u.trim()) }),
      })
      const data = (await res.json()) as {
        analysis?: MultiVideoAnalysis
        error?: string
        message?: string
      }
      if (!res.ok) {
        throw new Error(data.message || data.error || `エラー: ${res.status}`)
      }
      if (!data.analysis) throw new Error("分析結果が空でした")
      onResults(data.analysis, filledUrls.map((u) => u.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-[oklch(0.72_0.18_85)]" />
        <p className="text-sm font-medium text-muted-foreground">複数動画を分析中...</p>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center px-4 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto w-full max-w-xl">
        {/* Back button */}
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))" }}>
            <Layers className="h-7 w-7 text-white" />
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl">
            複数動画の共通点分析
          </h1>
          <p className="text-sm text-muted-foreground">
            2〜5本のURLを入力して共通パターンを抽出します
          </p>
        </div>

        {/* URL inputs */}
        <div className="flex flex-col gap-3">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: i < 2
                    ? "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))"
                    : "oklch(0.25 0.06 270 / 0.5)",
                  color: "white",
                }}>
                {i + 1}
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(i, e.target.value)}
                placeholder={i < 2 ? `動画${i + 1}のURL（必須）` : `動画${i + 1}のURL（任意）`}
                className={cn(
                  "flex-1 bg-[oklch(0.15_0.04_270_/_0.6)] border-[oklch(0.35_0.08_270_/_0.4)]",
                  "placeholder:text-muted-foreground/50 focus:border-[oklch(0.55_0.15_270_/_0.6)]",
                  url && !detectPlatform(url.trim()) && "border-red-500/50"
                )}
                disabled={loading}
              />
              {i >= 2 && (
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  disabled={loading}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add URL button */}
        {urls.length < 5 && (
          <button
            type="button"
            onClick={addUrl}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[oklch(0.45_0.1_270_/_0.3)] py-2.5 text-sm text-muted-foreground transition-colors hover:border-[oklch(0.55_0.12_270_/_0.5)] hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            URLを追加（最大5本）
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || filledUrls.length < 2}
          className="mt-6 w-full gap-2 py-6 text-base font-semibold"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              分析中...（しばらくお待ちください）
            </>
          ) : (
            <>
              <Layers className="h-5 w-5" />
              {filledUrls.length}本の共通点を分析する
            </>
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground/60">
          動画数が多いほど分析に時間がかかります（目安：30〜60秒）
        </p>
      </div>
    </main>
  )
}
