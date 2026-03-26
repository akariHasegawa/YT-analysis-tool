"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { UrlInputScreen } from "@/components/url-input-screen"
import { ProcessingScreen } from "@/components/processing-screen"
import { ResultsScreen } from "@/components/results-screen"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { VideoInfo } from "@/lib/video-info"
import { useLanguage } from "@/lib/language-context"

type Screen = "input" | "processing" | "results"

export default function Home() {
  const { t } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t
  const [screen, setScreen] = useState<Screen>("input")
  const [analyzedUrl, setAnalyzedUrl] = useState("")
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [metadataError, setMetadataError] = useState<string | undefined>()
  const [analysis, setAnalysis] = useState<ShortsAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | undefined>()
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const handleAnalyze = useCallback((url: string) => {
    setAnalyzedUrl(url)
    setVideoInfo(null)
    setMetadataError(undefined)
    setAnalysis(null)
    setAnalysisError(undefined)
    setAnalysisLoading(false)
    setScreen("processing")
  }, [])

  const handleMetadataReady = useCallback(
    (payload: { videoInfo: VideoInfo; metadataError?: string }) => {
      setVideoInfo(payload.videoInfo)
      setMetadataError(payload.metadataError)
      setAnalysis(null)
      setAnalysisError(undefined)
      setAnalysisLoading(!payload.metadataError)
      setScreen("results")
    },
    []
  )

  const handleReset = useCallback(() => {
    setScreen("input")
    setAnalyzedUrl("")
    setVideoInfo(null)
    setMetadataError(undefined)
    setAnalysis(null)
    setAnalysisError(undefined)
    setAnalysisLoading(false)
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
          }),
          signal: ac.signal,
        })
        const data = (await res.json()) as { analysis?: ShortsAnalysis; error?: string }
        if (ac.signal.aborted) return
        if (!res.ok) {
          setAnalysis(null)
          setAnalysisError(
            typeof data.error === "string" ? data.error : tRef.current("processing.error.analyzeFailed")
          )
          return
        }
        if (data.analysis) {
          setAnalysis(data.analysis)
        } else {
          setAnalysis(null)
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
  }, [screen, analyzedUrl, videoInfo, metadataError])

  if (screen === "processing") {
    return <ProcessingScreen key={analyzedUrl} url={analyzedUrl} onMetadataReady={handleMetadataReady} />
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        videoInfo={videoInfo}
        metadataError={metadataError}
        analysis={analysis}
        analysisError={analysisError}
        analysisLoading={analysisLoading}
        onReset={handleReset}
      />
    )
  }

  return <UrlInputScreen onAnalyze={handleAnalyze} />
}
