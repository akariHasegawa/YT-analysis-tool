"use client"

import { useState } from "react"
import { FileText, Download, ChevronDown, ChevronUp } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { VideoInfo } from "@/lib/video-info"
import type { ReportType } from "@/app/api/generate-report/route"

interface Props {
  analysis: ShortsAnalysis
  videoInfo: VideoInfo
  channelHint?: string
}

const REPORT_TYPES: { type: ReportType; label: string; description: string }[] = [
  { type: "internal", label: "内部用レポート", description: "全データ詳細・自分用" },
  { type: "client", label: "クライアント用レポート", description: "丁寧な文体・会社名入り" },
  { type: "script", label: "プレゼン台本", description: "クライアントへの説明用" },
]

export function ReportDownload({ analysis, videoInfo, channelHint = "" }: Props) {
  const { session } = useSupabaseAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<ReportType | null>(null)
  const [clientName, setClientName] = useState("")
  const [clientCompany, setClientCompany] = useState("")
  const [accountMemo, setAccountMemo] = useState(channelHint)

  const download = async (reportType: ReportType) => {
    if (!session?.access_token) return
    setLoading(reportType)
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ analysis, videoInfo, reportType, clientName, clientCompany, accountMemo }),
      })

      if (!res.ok) {
        let errMsg = "レポート生成に失敗しました"
        try {
          const data = await res.json() as { error?: string }
          errMsg = data.error ?? errMsg
        } catch { /* non-JSON response (e.g. timeout) */ }
        throw new Error(errMsg)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const filename = res.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''(.+)/)?.[1]
      a.href = url
      a.download = filename ? decodeURIComponent(filename) : `report_${reportType}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "レポート生成に失敗しました")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-2xl border border-[oklch(0.6_0.15_70_/_0.4)] bg-[oklch(0.14_0.05_280_/_0.5)] overflow-hidden">
      {/* ヘッダー */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[oklch(0.18_0.06_280_/_0.4)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.3_0.12_70_/_0.5)]">
            <FileText className="h-4 w-4 text-[oklch(0.85_0.15_75)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">レポート生成</p>
            <p className="text-xs text-muted-foreground">PDF形式でダウンロード</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-[oklch(0.5_0.1_270_/_0.2)] px-6 pb-6 pt-4 space-y-4">
          {/* アカウントメモ */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">アカウント名・メモ（全レポートに記載）</label>
            <input
              type="text"
              value={accountMemo}
              onChange={(e) => setAccountMemo(e.target.value)}
              placeholder="@username や「クライアントAのTikTok」など"
              className="w-full rounded-lg border border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.04_280_/_0.5)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.6_0.14_265_/_0.5)]"
            />
          </div>

          {/* クライアント情報入力 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">会社名（クライアント用）</label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="株式会社○○"
                className="w-full rounded-lg border border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.04_280_/_0.5)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.6_0.14_265_/_0.5)]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">担当者名（クライアント用）</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full rounded-lg border border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.04_280_/_0.5)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.6_0.14_265_/_0.5)]"
              />
            </div>
          </div>

          {/* ダウンロードボタン */}
          <div className="flex flex-col gap-2">
            {REPORT_TYPES.map(({ type, label, description }) => (
              <button
                key={type}
                type="button"
                onClick={() => download(type)}
                disabled={loading !== null}
                className="flex items-center justify-between rounded-xl border border-[oklch(0.5_0.1_270_/_0.2)] bg-[oklch(0.16_0.05_280_/_0.4)] px-4 py-3 text-left transition-all hover:border-[oklch(0.6_0.14_265_/_0.4)] hover:bg-[oklch(0.2_0.06_275_/_0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {loading === type ? (
                    <span className="text-xs text-[oklch(0.72_0.14_260)]">生成中...</span>
                  ) : (
                    <Download className="h-4 w-4 text-[oklch(0.72_0.14_260)]" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            ※ 内部用：約30秒。クライアント用・台本：AIがレポートを作成するため2〜3分かかります。生成中はリロードしないでください。
          </p>
        </div>
      )}
    </div>
  )
}
