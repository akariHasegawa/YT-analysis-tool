"use client"

import { useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import type { VideoInfo } from "@/lib/video-info"
import { emptyVideoInfo } from "@/lib/video-info"
import { isLikelyYouTubeUrl } from "@/lib/youtube-video-id"

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

      if (isLikelyYouTubeUrl(url)) {
        try {
          info = await fetchVideoMetadata(url, ac.signal)
        } catch (e) {
          if (ac.signal.aborted) return
          metadataError = e instanceof Error ? e.message : "動画メタデータの取得に失敗しました"
        }
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
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-16 pt-8">
      <div className="glass-card neon-card-glow w-full max-w-md rounded-2xl px-8 py-12 text-center sm:px-10 sm:py-14">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[oklch(0.55_0.15_260_/_0.35)] bg-[oklch(0.2_0.06_270_/_0.5)] shadow-[0_0_24px_oklch(0.55_0.2_270_/_0.2)]">
          <div
            className="h-9 w-9 rounded-full border-2 border-[oklch(0.45_0.08_270_/_0.5)] border-t-[oklch(0.78_0.16_240)] border-r-[oklch(0.65_0.2_300)] animate-spin"
            style={{ animationDuration: "0.9s" }}
            aria-hidden
          />
        </div>

        <h2 className="text-lg font-semibold tracking-wide text-foreground sm:text-xl">{t("processing.fetchingMetadata")}</h2>
        <p
          className="mt-4 truncate font-mono text-xs text-muted-foreground sm:text-sm"
          title={url}
        >
          {url}
        </p>
      </div>
    </main>
  )
}
