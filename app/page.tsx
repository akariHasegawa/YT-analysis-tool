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

  // Auth & plan state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [remainingAnalyses, setRemainingAnalyses] = useState(1)
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(false)

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

  const handleSignup = useCallback((method: "google" | "email", email?: string) => {
    setIsAuthenticated(true)
    setShowSignupModal(false)
    setUserPlan("pro")
    setRemainingAnalyses(30)
  }, [])

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
          <PricingSection onPlanSelect={handlePlanSelect} />
          <FooterCTA onGetStarted={handleGetStarted} />
        </main>
      </>
    )
  }

  if (screen === "mode-selection") {
    return (
      <ModeSelection
        onSelectMode={handleSelectMode}
        onBack={handleBackToLanding}
        userPlan={userPlan}
        remainingAnalyses={remainingAnalyses}
        maxAnalyses={maxAnalyses}
      />
    )
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
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignup={handleSignup}
      />
    </>
  )
}
