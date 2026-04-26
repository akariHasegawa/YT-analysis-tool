"use client"

import { useState } from "react"
import {
  Layers,
  Zap,
  Heart,
  Megaphone,
  Trophy,
  Lightbulb,
  FileText,
  Video,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MultiVideoAnalysis } from "@/lib/multi-video-analysis"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

interface MultiResultsScreenProps {
  analysis: MultiVideoAnalysis
  urls: string[]
  onReset: () => void
}

type CastCount = "1" | "2" | "3+"

function PromptGenerator({
  analysis,
  accentColor,
}: {
  analysis: MultiVideoAnalysis
  accentColor: string
}) {
  const { session } = useSupabaseAuth()
  const [theme, setTheme] = useState("")
  const [castCount, setCastCount] = useState<CastCount>("1")
  const [dialogueStyle, setDialogueStyle] = useState("")
  const [scriptPrompt, setScriptPrompt] = useState<string | null>(null)
  const [videoShortPrompt, setVideoShortPrompt] = useState<string | null>(null)
  const [videoLongPrompt, setVideoLongPrompt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTheme = theme.trim() || analysis.nextVideoIdeas[0] || ""

  const buildRequestBody = (promptType: "script" | "video-short" | "video-long") => ({
    idea: selectedTheme,
    promptType,
    castCount,
    dialogueStyle,
    context: {
      channelName: "",
      hook: analysis.commonHookPatterns.join(" / "),
      emotion: analysis.commonEmotionPatterns.join(" / "),
      improvementIdeas: analysis.keySuccessFactors,
      multiContext: {
        commonStructure: analysis.commonStructure,
        commonCTAPatterns: analysis.commonCTAPatterns,
        keySuccessFactors: analysis.keySuccessFactors,
      },
    },
  })

  const generateAll = async () => {
    if (!selectedTheme) { setError("テーマを入力してください"); return }
    setLoading(true)
    setError(null)
    setScriptPrompt(null)
    setVideoShortPrompt(null)
    setVideoLongPrompt(null)
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      const [scriptRes, shortRes, longRes] = await Promise.all([
        fetch("/api/generate-prompt", { method: "POST", headers, body: JSON.stringify(buildRequestBody("script")) }),
        fetch("/api/generate-prompt", { method: "POST", headers, body: JSON.stringify(buildRequestBody("video-short")) }),
        fetch("/api/generate-prompt", { method: "POST", headers, body: JSON.stringify(buildRequestBody("video-long")) }),
      ])
      const [scriptData, shortData, longData] = await Promise.all([
        scriptRes.json() as Promise<{ prompt?: string; error?: string }>,
        shortRes.json() as Promise<{ prompt?: string; error?: string }>,
        longRes.json() as Promise<{ prompt?: string; error?: string }>,
      ])
      if (scriptData.prompt) setScriptPrompt(scriptData.prompt)
      if (shortData.prompt) setVideoShortPrompt(shortData.prompt)
      if (longData.prompt) setVideoLongPrompt(longData.prompt)
      if (!scriptData.prompt && !shortData.prompt && !longData.prompt) throw new Error("生成に失敗しました")
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const castLabels: Record<CastCount, string> = {
    "1": "1人（ナレーション）",
    "2": "2人（対話）",
    "3+": "3人以上",
  }

  return (
    <div className="space-y-5">
      {/* テーマ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[oklch(0.75_0.1_260)]">テーマ</p>
        <p className="text-[11px] text-muted-foreground/70">空欄の場合は次回作アイデア①を使用します</p>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder={analysis.nextVideoIdeas[0] ?? "動画のテーマを入力"}
          className="w-full rounded-lg border border-[oklch(0.4_0.08_270_/_0.3)] bg-[oklch(0.15_0.05_270_/_0.5)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[oklch(0.55_0.15_260_/_0.6)] focus:outline-none"
        />
        {/* クイック選択 */}
        <div className="flex flex-wrap gap-1.5">
          {analysis.nextVideoIdeas.map((idea, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTheme(idea)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                theme === idea
                  ? "border-[oklch(0.55_0.18_260_/_0.6)] bg-[oklch(0.35_0.12_260_/_0.5)] text-foreground"
                  : "border-[oklch(0.4_0.08_270_/_0.25)] bg-[oklch(0.18_0.05_270_/_0.4)] text-muted-foreground hover:text-foreground"
              )}
            >
              アイデア{i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 登場人数 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[oklch(0.75_0.1_260)]">登場人数</p>
        <p className="text-[11px] text-muted-foreground/70">1人＝ナレーション形式　2人以上＝対話形式</p>
        <div className="flex gap-2">
          {(["1", "2", "3+"] as CastCount[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCastCount(c)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                castCount === c
                  ? "bg-[oklch(0.45_0.18_250)] text-white border-[oklch(0.5_0.2_250)]"
                  : "bg-[oklch(0.2_0.06_270_/_0.5)] text-muted-foreground border-[oklch(0.4_0.08_270_/_0.3)] hover:border-[oklch(0.5_0.1_270_/_0.5)]"
              )}
            >
              {castLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {/* 対話の雰囲気 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[oklch(0.75_0.1_260)]">対話の雰囲気・スタイル（任意）</p>
        <p className="text-[11px] text-muted-foreground/70">例：白熱した議論　冷静な解説　コミカル　感動的　緊迫感あり</p>
        <input
          type="text"
          value={dialogueStyle}
          onChange={(e) => setDialogueStyle(e.target.value)}
          placeholder="例：冷静な解説スタイルで"
          className="w-full rounded-lg border border-[oklch(0.4_0.08_270_/_0.3)] bg-[oklch(0.15_0.05_270_/_0.5)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-[oklch(0.55_0.15_260_/_0.6)] focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* 生成ボタン */}
      <button
        type="button"
        onClick={generateAll}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 250), oklch(0.45 0.18 300))" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "生成中...（3種類を同時生成）" : "台本＋ショート動画＋通常動画プロンプトを生成"}
      </button>

      {/* 結果 */}
      {scriptPrompt && (
        <ResultBox label="台本プロンプト" sublabel="ChatGPT / Claude に貼り付けて使う" text={scriptPrompt} accentColor="oklch(0.55 0.18 250)" />
      )}
      {videoShortPrompt && (
        <ResultBox label="動画プロンプト（ショート・60秒）" sublabel="TikTok / Reels / YouTube Shorts 向け" text={videoShortPrompt} accentColor="oklch(0.55 0.18 180)" />
      )}
      {videoLongPrompt && (
        <ResultBox label="動画プロンプト（通常動画・5〜15分）" sublabel="YouTube 通常動画向け" text={videoLongPrompt} accentColor="oklch(0.55 0.18 300)" />
      )}
    </div>
  )
}

function ResultBox({ label, sublabel, text, accentColor }: { label: string; sublabel: string; text: string; accentColor: string }) {
  return (
    <div className="rounded-xl border border-[oklch(0.35_0.08_270_/_0.2)] bg-[oklch(0.12_0.04_270_/_0.5)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[oklch(0.35_0.08_270_/_0.15)]"
        style={{ background: `${accentColor.replace(")", " / 0.08)")}` }}>
        <div>
          <p className="text-xs font-bold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground/70">{sublabel}</p>
        </div>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed text-foreground/80 font-sans">{text}</pre>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[oklch(0.25_0.06_270_/_0.4)] hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "コピー済み" : "コピー"}
    </button>
  )
}

function Section({
  icon: Icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ElementType
  title: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <div className="glass-card rounded-2xl border border-[oklch(0.35_0.08_270_/_0.25)] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: accentColor }}
        >
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: color }}
          >
            {i + 1}
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function PromptBox({ text, label }: { text: string; label: string }) {
  return (
    <div className="rounded-xl border border-[oklch(0.35_0.08_270_/_0.2)] bg-[oklch(0.12_0.04_270_/_0.5)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{text}</p>
    </div>
  )
}

export function MultiResultsScreen({ analysis, urls, onReset }: MultiResultsScreenProps) {
  const accentGradient = "linear-gradient(135deg, oklch(0.72 0.18 85), oklch(0.55 0.22 300))"
  const accentColor1 = "oklch(0.55 0.22 300)"
  const accentColor2 = "oklch(0.6 0.2 200)"
  const accentColor3 = "oklch(0.65 0.18 150)"
  const accentColor4 = "oklch(0.62 0.2 40)"
  const accentColor5 = "oklch(0.55 0.22 270)"

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: accentGradient }}
          >
            <Layers className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            複数動画の共通点分析
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{urls.length}本の動画から共通パターンを抽出しました</p>
        </div>

        {/* Video summaries */}
        <div className="mb-6 flex flex-col gap-3">
          {analysis.videoSummaries.map((v, i) => (
            <div
              key={i}
              className="glass-card flex items-start gap-3 rounded-xl border border-[oklch(0.35_0.08_270_/_0.25)] p-4"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: accentGradient }}
              >
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {v.title || urls[i] || `動画${i + 1}`}
                </p>
                {v.keyFeature && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{v.keyFeature}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Common structure */}
        {analysis.commonStructure && (
          <div className="mb-6">
            <Section icon={Layers} title="共通する構成パターン" accentColor={accentGradient}>
              <p className="text-sm leading-relaxed text-muted-foreground">{analysis.commonStructure}</p>
            </Section>
          </div>
        )}

        {/* Patterns grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Section icon={Zap} title="共通フック" accentColor={accentColor1}>
            <TagList items={analysis.commonHookPatterns} color={accentColor1} />
          </Section>
          <Section icon={Heart} title="共通感情設計" accentColor={accentColor2}>
            <TagList items={analysis.commonEmotionPatterns} color={accentColor2} />
          </Section>
          <Section icon={Megaphone} title="共通CTA" accentColor={accentColor3}>
            <TagList items={analysis.commonCTAPatterns} color={accentColor3} />
          </Section>
        </div>

        {/* Key success factors */}
        <div className="mb-6">
          <Section icon={Trophy} title="成功要因 TOP5" accentColor={accentColor4}>
            <TagList items={analysis.keySuccessFactors} color={accentColor4} />
          </Section>
        </div>

        {/* Next video ideas */}
        <div className="mb-6">
          <Section icon={Lightbulb} title="次回作アイデア" accentColor={accentColor5}>
            <div className="grid gap-2 sm:grid-cols-2">
              {analysis.nextVideoIdeas.map((idea, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border border-[oklch(0.4_0.1_270_/_0.2)] p-3",
                    "bg-[oklch(0.15_0.05_270_/_0.4)] text-sm text-muted-foreground"
                  )}
                >
                  <span
                    className="mb-1 block text-xs font-bold"
                    style={{ color: accentColor5 }}
                  >
                    アイデア {i + 1}
                  </span>
                  {idea}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Prompt generator */}
        <div className="mb-8">
          <Section icon={Sparkles} title="台本・動画プロンプトを生成" accentColor="linear-gradient(135deg, oklch(0.55 0.2 180), oklch(0.6 0.2 260))">
            <PromptGenerator analysis={analysis} accentColor="oklch(0.55 0.2 180)" />
          </Section>
        </div>

        {/* Reset */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={onReset}
            className="gap-2 border-[oklch(0.4_0.1_270_/_0.3)] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            トップに戻る
          </Button>
        </div>
      </div>
    </main>
  )
}
