export type Platform = "youtube" | "tiktok" | "instagram"

export interface ExtensionPayload {
  views: number | null
  likes: number | null
  comments: number | null
  captions: string
}

export interface PlatformAdapter {
  /** URLがこのプラットフォームのものか判定 */
  detect(url: string): boolean
  /** 字幕・テロップを取得（取得できない場合は空文字） */
  fetchTranscript(url: string, options: { durationHintSec: number | null }): Promise<string>
}

export function detectPlatform(url: string): Platform | null {
  const u = url.toLowerCase()
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
  if (u.includes("tiktok.com")) return "tiktok"
  if (u.includes("instagram.com")) return "instagram"
  return null
}
