"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { LandingHero } from "@/components/landing-hero"
import { PricingSection } from "@/components/pricing-section"
import { FooterCTA } from "@/components/footer-cta"
import { ModeSelection, type AnalysisMode } from "@/components/mode-selection"
import { UrlInputScreen } from "@/components/url-input-screen"
import { ProcessingScreen } from "@/components/processing-screen"
import { ResultsScreen } from "@/components/results-screen"
import { SignupModal } from "@/components/signup-modal"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { ReferenceInsightsPayload } from "@/lib/reference-insights"
import type { VideoInfo } from "@/lib/video-info"
import type { PlanType } from "@/components/upgrade-modal"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { effectiveMonthlyCount, remainingAnalysesForPlan, type UserUsageRow } from "@/lib/analysis-usage"
import { useLanguage } from "@/lib/language-context"

type Screen = "landing" | "mode-selection" | "input" | "processing" | "results"

export default function Home() {
  const { t } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t

  // Screen flow state
  const [screen, setScreen] = useState<Screen>("landing")
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>("buzz")

  // Analysis state
  const [analyzedUrl, setAnalyzedUrl] = useState("")
  const [competitorUrl, setCompetitorUrl] = useState<string | undefined>()
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [metadataError, setMetadataError] = useState<string | undefined>()
  const [analysis, setAnalysis] = useState<ShortsAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | undefined>()
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [referenceInsights, setReferenceInsights] = useState<ReferenceInsightsPayload | null>(null)

  const { session, refreshSession, supabase } = useSupabaseAuth()

  const sessionRef = useRef(session)
  sessionRef.current = session
  const supabaseRef = useRef(supabase)
  supabaseRef.current = supabase

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [remainingAnalyses, setRemainingAnalyses] = useState(1)
  /** 同じ URL の分析に対して、結果表示後の登録モーダルを二重に出さない */
  const postAnalysisSignupPromptedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setUserPlan("free")
      setRemainingAnalyses(1)
      setIsAuthenticated(false)
      return
    }
    void supabase
      .from("users")
      .select("plan, analysis_count_total, analysis_count_month, usage_month")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        const row = data as UserUsageRow
        const plan = row.plan as PlanType
        setUserPlan(plan)
        const eff = effectiveMonthlyCount(row)
        setRemainingAnalyses(remainingAnalysesForPlan(plan, row.analysis_count_total ?? 0, eff))
        const isAnon = Boolean((session.user as { is_anonymous?: boolean }).is_anonymous)
        setIsAuthenticated(!isAnon)
      })
  }, [supabase, session])

  const maxAnalyses = userPlan === "business" ? 100 : userPlan === "pro" ? 30 : 1

  const handleGetStarted = useCallback(() => {
    setScreen("mode-selection")
  }, [])

  const handlePricingClick = useCallback(() => {
    const pricingSection = document.getElementById("pricing")
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const handlePlanSelect = useCallback((plan: string) => {
    if (plan === "free") {
      setScreen("mode-selection")
    } else {
      setShowSignupModal(true)
    }
  }, [])

  const handleSelectMode = useCallback((mode: AnalysisMode) => {
    setSelectedMode(mode)
    setScreen("input")
  }, [])

  const handleBackToLanding = useCallback(() => {
    setScreen("landing")
  }, [])

  const handleBackToModes = useCallback(() => {
    setScreen("mode-selection")
  }, [])

  const handleAnalyze = useCallback((url: string, competitor?: string) => {
    setAnalyzedUrl(url)
    setCompetitorUrl(competitor)
    setVideoInfo(null)
    setMetadataError(undefined)
    setAnalysis(null)
    setAnalysisError(undefined)
    setAnalysisLoading(false)
    setReferenceInsights(null)
    setScreen("processing")
  }, [])

  const handleMetadataReady = useCallback(
    (payload: { videoInfo: VideoInfo; metadataError?: string }) => {
      setVideoInfo(payload.videoInfo)
      setMetadataError(payload.metadataError)
      setAnalysis(null)
      setAnalysisError(undefined)
      setReferenceInsights(null)
      setAnalysisLoading(!payload.metadataError)
      setScreen("results")
    },
    []
  )

  const handleReset = useCallback(() => {
    setScreen("landing")
    setAnalyzedUrl("")
    setCompetitorUrl(undefined)
    setVideoInfo(null)
    setMetadataError(undefined)
    setAnalysis(null)
    setAnalysisError(undefined)
    setAnalysisLoading(false)
    setReferenceInsights(null)
    postAnalysisSignupPromptedUrlRef.current = null
  }, [])

  const handleAuthSuccess = useCallback(() => {
    setShowSignupModal(false)
    void refreshSession()
  }, [refreshSession])

  // Analysis effect（セッションなしでもゲスト1回まで API 側で許可。Authorization は任意）
  useEffect(() => {
    if (screen !== "results") return
    if (!analyzedUrl || !videoInfo) return
    if (metadataError) return

    const ac = new AbortController()
    setAnalysisLoading(true)
    setAnalysisError(undefined)

    ;(async () => {
      try {
        const s = sessionRef.current
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        const token = s?.access_token
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({
            url: analyzedUrl,
            title: videoInfo.title,
            channelName: videoInfo.channelName,
            publishedAt: videoInfo.publishedAt,
            viewCount: videoInfo.views,
            duration: videoInfo.durationSeconds,
            thumbnailUrl: videoInfo.thumbnailUrl,
            competitorUrl: competitorUrl,
            mode: selectedMode,
          }),
          signal: ac.signal,
        })
        const data = (await res.json()) as {
          analysis?: ShortsAnalysis
          referenceInsights?: ReferenceInsightsPayload
          usage?: Pick<UserUsageRow, "plan" | "analysis_count_total" | "analysis_count_month" | "usage_month">
          error?: string
          plan?: string
          message?: string
        }
        if (ac.signal.aborted) return
        if (!res.ok) {
          setAnalysis(null)
          setReferenceInsights(null)
          if (data.error === "LIMIT_EXCEEDED") {
            setAnalysisError(
              tRef.current("processing.error.limitExceeded") ||
                `分析回数の上限に達しました（プラン: ${data.plan ?? "unknown"}）`
            )
          } else if (data.error === "UNAUTHORIZED") {
            setAnalysisError(tRef.current("processing.error.unauthorized") || "認証に失敗しました。再度ログインしてください。")
          } else if (data.error === "SUPABASE_NOT_CONFIGURED") {
            setAnalysisError(
              typeof data.message === "string"
                ? data.message
                : tRef.current("processing.error.supabase") || "Supabase が未設定です。"
            )
          } else if (data.error === "OPENAI_RATE_LIMIT" || res.status === 429) {
            setAnalysisError(
              typeof data.message === "string"
                ? data.message
                : tRef.current("processing.error.openaiRateLimit") ||
                    "OpenAI のレート制限に達しました。しばらく待ってから再度お試しください。"
            )
          } else {
            setAnalysisError(
              typeof data.error === "string" ? data.error : tRef.current("processing.error.analyzeFailed")
            )
          }
          return
        }
        if (data.analysis) {
          setAnalysis(data.analysis)
          setReferenceInsights(
            data.referenceInsights ?? {
              sourceThumbnail: null,
              enrichedImprovements: [],
            }
          )
          const s2 = sessionRef.current
          const isRegistered = Boolean(
            s2?.user && !(s2.user as { is_anonymous?: boolean }).is_anonymous
          )
          if (!isRegistered && postAnalysisSignupPromptedUrlRef.current !== analyzedUrl) {
            postAnalysisSignupPromptedUrlRef.current = analyzedUrl
            window.setTimeout(() => {
              setShowSignupModal(true)
            }, 2800)
          }
          if (data.usage) {
            const u = data.usage as UserUsageRow
            const plan = u.plan as PlanType
            setUserPlan(plan)
            const eff = effectiveMonthlyCount(u)
            setRemainingAnalyses(remainingAnalysesForPlan(plan, u.analysis_count_total ?? 0, eff))
          } else {
            const sb = supabaseRef.current
            if (sb && s2?.user) {
              const { data: row } = await sb
                .from("users")
                .select("plan, analysis_count_total, analysis_count_month, usage_month")
                .eq("id", s2.user.id)
                .single()
              if (row) {
                const u = row as UserUsageRow
                const plan = u.plan as PlanType
                setUserPlan(plan)
                const eff = effectiveMonthlyCount(u)
                setRemainingAnalyses(remainingAnalysesForPlan(plan, u.analysis_count_total ?? 0, eff))
              }
            }
          }
        } else {
          setAnalysis(null)
          setReferenceInsights(null)
          setAnalysisError(tRef.current("processing.error.analyzeEmpty"))
        }
      } catch (e) {
        if (ac.signal.aborted) return
        const message = e instanceof Error ? e.message : tRef.current("processing.error.analyzeFailed")
        setAnalysis(null)
        setAnalysisError(message)
      } finally {
        if (!ac.signal.aborted) setAnalysisLoading(false)
      }
    })()

    return () => ac.abort()
  }, [screen, analyzedUrl, videoInfo, metadataError, competitorUrl, selectedMode])

  if (screen === "landing") {
    return (
      <>
        <Header onPricingClick={handlePricingClick} onGetStartedClick={handleGetStarted} />
        <main className="bg-[#060810]">
          <LandingHero onGetStarted={handleGetStarted} />
          <PricingSection onPlanSelect={handlePlanSelect} />
          <FooterCTA onGetStarted={handleGetStarted} />
        </main>
      </>
    )
  }

  if (screen === "mode-selection") {
    return <ModeSelection onSelectMode={handleSelectMode} onBack={handleBackToLanding} />
  }

  if (screen === "input") {
    return (
      <UrlInputScreen
        onAnalyze={handleAnalyze}
        onBack={handleBackToModes}
        mode={selectedMode}
      />
    )
  }

  if (screen === "processing") {
    return <ProcessingScreen key={analyzedUrl} url={analyzedUrl} onMetadataReady={handleMetadataReady} />
  }

  return (
    <>
      <ResultsScreen
        videoInfo={videoInfo}
        metadataError={metadataError}
        analysis={analysis}
        analysisError={analysisError}
        analysisLoading={analysisLoading}
        referenceInsights={referenceInsights}
        onReset={handleReset}
        userPlan={userPlan}
        remainingAnalyses={remainingAnalyses}
        maxAnalyses={maxAnalyses}
        analysisMode={selectedMode}
        hadCompetitorUrl={Boolean(competitorUrl?.trim())}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  )
}
