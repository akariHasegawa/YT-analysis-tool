import type { PlatformAdapter } from "./types"

// Phase 2: Chrome拡張からのcaptionsを使うため、fetchTranscriptはスタブ
// 実際のテロップはAPIリクエストのextensionData.captionsから取得する
export const tiktokPlatform: PlatformAdapter = {
  detect(url: string): boolean {
    return url.toLowerCase().includes("tiktok.com")
  },

  async fetchTranscript(_url: string, _options: { durationHintSec: number | null }): Promise<string> {
    return ""
  },
}
