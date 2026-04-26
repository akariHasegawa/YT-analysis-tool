import { extractYouTubeVideoId, isLikelyYouTubeUrl } from "@/lib/youtube-video-id"
import { fetchYouTubeTranscriptLines } from "@/lib/youtube-transcript-lines"
import type { PlatformAdapter } from "./types"

export const youtubePlatform: PlatformAdapter = {
  detect(url: string): boolean {
    return isLikelyYouTubeUrl(url)
  },

  async fetchTranscript(url: string, options: { durationHintSec: number | null }): Promise<string> {
    const vid = extractYouTubeVideoId(url)
    if (!vid) return ""
    try {
      const t = await fetchYouTubeTranscriptLines(vid, { durationHintSec: options.durationHintSec })
      return t?.trim() ?? ""
    } catch {
      return ""
    }
  },
}

export { extractYouTubeVideoId, isLikelyYouTubeUrl }
