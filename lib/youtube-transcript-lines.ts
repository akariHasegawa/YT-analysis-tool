import { YoutubeTranscript } from "youtube-transcript"

const MAX_CHARS = 48_000

export type FetchYouTubeTranscriptOptions = {
  /**
   * YouTube Data API の duration（秒）。あるとき、字幕ライブラリがミリ秒で返している場合に
   * 秒へ補正する（例: 61秒動画で 61840 が出るケース）。
   */
  durationHintSec?: number | null
}

/**
 * 字幕の offset/duration がミリ秒かどうかを推定し、秒に揃えるスケール（1 または 1/1000）。
 */
function transcriptTimeScale(
  items: Array<{ offset: number; duration: number }>,
  durationHintSec: number | null | undefined
): number {
  if (!items.length) return 1
  const maxEnd = Math.max(...items.map((it) => it.offset + it.duration))
  if (durationHintSec != null && durationHintSec > 0 && maxEnd > durationHintSec * 3) {
    return 0.001
  }
  return 1
}

/**
 * YouTube 公式APIなしで字幕を取得し、秒付きテキストに整形する。
 * 失敗時は null（呼び出し側で握りつぶす）。
 */
export async function fetchYouTubeTranscriptLines(
  videoId: string,
  options?: FetchYouTubeTranscriptOptions
): Promise<string | null> {
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

  const hint = options?.durationHintSec
  const scale = transcriptTimeScale(items, hint ?? null)
  if (scale !== 1 && hint != null && hint > 0) {
    console.log(
      "[youtube-transcript] applying ms→s scale (maxEnd vs durationHint):",
      Math.max(...items.map((i) => i.offset + i.duration)),
      "vs",
      hint
    )
  }

  const lines = items.map((it) => {
    const start = it.offset * scale
    const end = (it.offset + it.duration) * scale
    const t = it.text.replace(/\s+/g, " ").trim()
    return `[${start.toFixed(2)}s-${end.toFixed(2)}s] ${t}`
  })

  let text = lines.join("\n")
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n...(字幕が長いため省略)..."
  }
  return text
}
