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
import { useLanguage } from "@/lib/language-context"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { createBrowserSupabase } from "@/lib/supabase"

type Screen = "landing" | "mode-selection" | "input" | "processing" | "results"
type PaidPlan = "pro" | "business"

export default function Home() {
  const { t } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t

  const { session, refreshSession } = useSupabaseAuth()

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

  // Auth & plan state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [remainingAnalyses, setRemainingAnalyses] = useState(1)
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(false)
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<PaidPlan | null>(null)
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PaidPlan | null>(null)

  const maxAnalyses = userPlan === "business" ? 100 : userPlan === "pro" ? 30 : 1

  useEffect(() => {
    const isAnon = Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous)
    const authenticated = Boolean(session?.user) && !isAnon
    setIsAuthenticated(authenticated)

    if (!authenticated || !session?.user) {
      setUserPlan("free")
      return
    }
    const supabase = createBrowserSupabase()
    supabase
      .from("users")
      .select("plan")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) setUserPlan(data.plan as PlanType)
      })
  }, [session])

  const beginStripeCheckout = useCallback(
    async (plan: PaidPlan) => {
      if (!isAuthenticated || !session?.access_token) {
        setPendingCheckoutPlan(plan)
        setShowSignupModal(true)
        return
      }
      setCheckoutLoadingPlan(plan)
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan }),
        })
        const data = (await res.json()) as { url?: string; message?: string; error?: string }
        if (!res.ok || !data.url) {
          throw new Error(data.message || data.error || "チェックアウトの作成に失敗しました")
        }
        window.location.href = data.url
      } catch (e) {
        alert(e instanceof Error ? e.message : "チェックアウトに失敗しました")
      } finally {
        setCheckoutLoadingPlan(null)
      }
    },
    [isAuthenticated, session]
  )

  const handleGetStarted = useCallback(() => {
    setScreen("mode-selection")
  }, [])

  const handlePricingClick = useCallback(() => {
    const pricingSection = document.getElementById("pricing")
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const handlePlanSelect = useCallback(
    async (plan: string) => {
      if (plan === "free") {
        setScreen("mode-selection")
        return
      }
      if (plan === "pro" || plan === "business") {
        await beginStripeCheckout(plan)
      }
    },
    [beginStripeCheckout]
  )

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

      if (!isAuthenticated && !hasUsedFreeAnalysis) {
        setHasUsedFreeAnalysis(true)
        setRemainingAnalyses(0)
        setTimeout(() => {
          setShowSignupModal(true)
        }, 3000)
      }
    },
    [isAuthenticated, hasUsedFreeAnalysis]
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
  }, [])

  const handleAuthSuccess = useCallback(async () => {
    setShowSignupModal(false)
    await refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (!pendingCheckoutPlan) return
    if (!isAuthenticated) return
    void beginStripeCheckout(pendingCheckoutPlan)
    setPendingCheckoutPlan(null)
  }, [pendingCheckoutPlan, isAuthenticated, beginStripeCheckout])

  useEffect(() => {
    if (screen !== "results") return
    if (!analyzedUrl || !videoInfo) return
    if (metadataError) return

    const ac = new AbortController()
    setAnalysisLoading(true)
    setAnalysisError(undefined)

    ;(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          error?: string
        }
        if (ac.signal.aborted) return
        if (!res.ok) {
          setAnalysis(null)
          setReferenceInsights(null)
          setAnalysisError(
            typeof data.error === "string" ? data.error : tRef.current("processing.error.analyzeFailed")
          )
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
          <PricingSection onPlanSelect={handlePlanSelect} checkoutLoadingPlan={checkoutLoadingPlan} />
          <FooterCTA onGetStarted={handleGetStarted} />
        </main>
        <SignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    )
  }

  if (screen === "mode-selection") {
    return <ModeSelection onSelectMode={handleSelectMode} onBack={handleBackToLanding} />
  }

  if (screen === "input") {
    return <UrlInputScreen onAnalyze={handleAnalyze} onBack={handleBackToModes} mode={selectedMode} />
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
        onUpgrade={beginStripeCheckout}
        userPlan={userPlan}
        remainingAnalyses={remainingAnalyses}
        maxAnalyses={maxAnalyses}
        isFirstFreeAnalysis={!isAuthenticated && !hasUsedFreeAnalysis}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  )
}
