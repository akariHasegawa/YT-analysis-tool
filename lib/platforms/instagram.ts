import type { PlatformAdapter } from "./types"

// Phase 3: Chrome拡張からのcaptionsを使うため、fetchTranscriptはスタブ
// 実際のテロップはAPIリクエストのextensionData.captionsから取得する
export const instagramPlatform: PlatformAdapter = {
  detect(url: string): boolean {
    return url.toLowerCase().includes("instagram.com")
  },

  async fetchTranscript(_url: string, _options: { durationHintSec: number | null }): Promise<string> {
    return ""
  },
}
