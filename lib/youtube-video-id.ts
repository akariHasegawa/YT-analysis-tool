/** YouTube URL から動画 ID を抽出する（shorts / watch / youtu.be / embed） */
export function extractYouTubeVideoId(input: string): string | null {
  try {
    const u = new URL(input.trim())
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "")
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]
      return id || null
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2]?.split("?")[0] || null
      }
      const v = u.searchParams.get("v")
      if (v) return v
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/)
      if (embed) return embed[1]
    }
    return null
  } catch {
    return null
  }
}

export function isLikelyYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    const h = u.hostname.replace(/^www\./, "").replace(/^m\./, "")
    return h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com")
  } catch {
    return false
  }
}
