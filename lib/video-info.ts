import { extractYouTubeVideoId } from "@/lib/youtube-video-id"

/** oEmbed +（任意で）YouTube Data API から組み立てた動画メタ情報 */
export type VideoThumbnail = {
  url: string
  width?: number
  height?: number
}

export type VideoThumbnails = Record<string, VideoThumbnail>

export interface VideoInfo {
  title: string
  channelName: string
  thumbnailUrl: string
  authorUrl: string | null
  thumbnailWidth: number | null
  thumbnailHeight: number | null
  providerName: string | null
  videoId: string | null
  publishedAt: string | null
  thumbnails: VideoThumbnails
  /** Data API（要 API キー）。未取得時は null */
  views: number | null
  durationSeconds: number | null
  likeCount: number | null
}

export function emptyVideoInfo(url: string): VideoInfo {
  return {
    title: "",
    channelName: "",
    thumbnailUrl: "",
    authorUrl: null,
    thumbnailWidth: null,
    thumbnailHeight: null,
    providerName: null,
    videoId: extractYouTubeVideoId(url),
    publishedAt: null,
    thumbnails: {},
    views: null,
    durationSeconds: null,
    likeCount: null,
  }
}
