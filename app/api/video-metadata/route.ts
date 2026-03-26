import { NextRequest, NextResponse } from "next/server"
import { extractYouTubeVideoId, isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { parseIso8601DurationSeconds } from "@/lib/youtube-duration"
import type { VideoInfo } from "@/lib/video-info"

type OEmbedPayload = {
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  provider_name?: string
  provider_url?: string
}

function parseOptionalInt(v: unknown): number | null {
  if (v == null) return null
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim()
  if (!url) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 })
  }
  if (!isLikelyYouTubeUrl(url)) {
    return NextResponse.json({ error: "invalid_youtube" }, { status: 400 })
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const oembedRes = await fetch(oembedUrl)
  if (!oembedRes.ok) {
    return NextResponse.json({ error: "oembed_failed", status: oembedRes.status }, { status: 502 })
  }

  const raw = (await oembedRes.json()) as OEmbedPayload
  const videoId = extractYouTubeVideoId(url)

  let title = typeof raw.title === "string" ? raw.title : ""
  let channelName = typeof raw.author_name === "string" ? raw.author_name : ""
  let thumbnailUrl = typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : ""
  let thumbnailWidth: number | null = typeof raw.thumbnail_width === "number" ? raw.thumbnail_width : null
  let thumbnailHeight: number | null = typeof raw.thumbnail_height === "number" ? raw.thumbnail_height : null

  let publishedAt: string | null = null
  let thumbnails: Record<string, { url: string; width?: number; height?: number }> = {}

  let views: number | null = null
  let durationSeconds: number | null = null
  let likeCount: number | null = null

  const key = process.env.YOUTUBE_DATA_API_KEY
  if (key && videoId) {
    const qs = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: videoId,
      key,
    })
    const apiRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`)
    if (apiRes.ok) {
      const j = (await apiRes.json()) as {
        items?: Array<{
          snippet?: {
            title?: string
            channelTitle?: string
            publishedAt?: string
            thumbnails?: Record<
              string,
              { url?: string; width?: number; height?: number } | { url?: string; width?: number; height?: number }
            >
          }
          statistics?: { viewCount?: string; likeCount?: string }
          contentDetails?: { duration?: string }
        }>
      }
      const item = j.items?.[0]
      if (item) {
        if (typeof item.snippet?.title === "string") title = item.snippet.title
        if (typeof item.snippet?.channelTitle === "string") channelName = item.snippet.channelTitle
        if (typeof item.snippet?.publishedAt === "string") publishedAt = item.snippet.publishedAt

        if (item.snippet?.thumbnails) {
          for (const [k, v] of Object.entries(item.snippet.thumbnails)) {
            const urlStr = typeof v?.url === "string" ? v.url : null
            if (!urlStr) continue
            thumbnails[k] = {
              url: urlStr,
              width: typeof v?.width === "number" ? v.width : undefined,
              height: typeof v?.height === "number" ? v.height : undefined,
            }
          }

          const preferred = ["high", "medium", "default", "standard", "maxres"]
          const bestKey = preferred.find((k) => thumbnails[k]?.url)
          if (bestKey) {
            thumbnailUrl = thumbnails[bestKey].url
            thumbnailWidth = thumbnails[bestKey].width ?? null
            thumbnailHeight = thumbnails[bestKey].height ?? null
          }
        }

        views = parseOptionalInt(item.statistics?.viewCount)
        likeCount = parseOptionalInt(item.statistics?.likeCount)

        const dur = item.contentDetails?.duration
        if (dur) {
          const sec = parseIso8601DurationSeconds(dur)
          durationSeconds = sec !== null ? sec : null
        }
      }
    }
  }

  const body: VideoInfo = {
    title,
    channelName,
    thumbnailUrl,
    authorUrl: typeof raw.author_url === "string" ? raw.author_url : null,
    thumbnailWidth,
    thumbnailHeight,
    providerName: typeof raw.provider_name === "string" ? raw.provider_name : null,
    videoId,
    views,
    durationSeconds,
    likeCount,
    publishedAt,
    thumbnails,
  }

  return NextResponse.json(body)
}
