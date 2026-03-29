import { YoutubeTranscript } from "youtube-transcript"

const MAX_CHARS = 48_000

/**
 * YouTube 公式APIなしで字幕を取得し、秒付きテキストに整形する。
 * 失敗時は null（呼び出し側で握りつぶす）。
 */
export async function fetchYouTubeTranscriptLines(videoId: string): Promise<string | null> {
  if (!videoId) return null

  let items: Awaited<ReturnType<typeof YoutubeTranscript.fetchTranscript>>
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ja" })
  } catch {
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId)
    } catch {
      return null
    }
  }

  if (!items?.length) return null

  const lines = items.map((it) => {
    const start = it.offset
    const end = it.offset + it.duration
    const t = it.text.replace(/\s+/g, " ").trim()
    return `[${start.toFixed(2)}s-${end.toFixed(2)}s] ${t}`
  })

  let text = lines.join("\n")
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n...(字幕が長いため省略)..."
  }
  return text
}
