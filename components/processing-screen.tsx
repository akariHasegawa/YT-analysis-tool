"use client"

import { useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import { Loader2 } from "lucide-react"
import type { VideoInfo } from "@/lib/video-info"
import { emptyVideoInfo } from "@/lib/video-info"

interface ProcessingScreenProps {
  url: string
  onMetadataReady: (payload: { videoInfo: VideoInfo; metadataError?: string }) => void
}

async function fetchVideoMetadata(url: string, signal?: AbortSignal): Promise<VideoInfo> {
  const res = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`, { signal })
  const data = (await res.json()) as (Partial<VideoInfo> & { error?: string; message?: string })

  if (!res.ok || data.error) {
    const code = typeof data.error === "string" ? data.error : "unknown_error"
    const message = typeof data.message === "string" ? data.message : `動画メタデータの取得に失敗しました（${code}）`
    throw new Error(message)
  }

  return {
    title: data.title ?? "",
    channelName: data.channelName ?? "",
    thumbnailUrl: data.thumbnailUrl ?? "",
    authorUrl: data.authorUrl ?? null,
    thumbnailWidth: data.thumbnailWidth ?? null,
    thumbnailHeight: data.thumbnailHeight ?? null,
    providerName: data.providerName ?? null,
    videoId: data.videoId ?? null,
    publishedAt: data.publishedAt ?? null,
    thumbnails: (data.thumbnails as VideoInfo["thumbnails"]) ?? {},
    views: data.views ?? null,
    durationSeconds: data.durationSeconds ?? null,
    likeCount: data.likeCount ?? null,
  }
}

export function ProcessingScreen({ url, onMetadataReady }: ProcessingScreenProps) {
  const { t } = useLanguage()

  useEffect(() => {
    const ac = new AbortController()
    let cancelled = false

    const run = async () => {
      let info: VideoInfo = emptyVideoInfo(url)
      let metadataError: string | undefined

      try {
        info = await fetchVideoMetadata(url, ac.signal)
      } catch (e) {
        if (ac.signal.aborted) return
        metadataError = e instanceof Error ? e.message : "動画メタデータの取得に失敗しました"
      }
      if (cancelled) return
      onMetadataReady({ videoInfo: info, metadataError })
    }

    run()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [url, onMetadataReady])

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Loader2 className="w-9 h-9 text-primary animate-spin" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">{t("processing.fetchingMetadata")}</h2>
          <p className="text-sm text-muted-foreground font-mono truncate max-w-xs mx-auto" title={url}>
            {url}
          </p>
        </div>
      </div>
    </main>
  )
}
