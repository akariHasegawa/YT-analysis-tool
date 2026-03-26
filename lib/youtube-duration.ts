/** YouTube Data API の contentDetails.duration（ISO 8601、例 PT47S, PT1M30S）を秒に変換 */
export function parseIso8601DurationSeconds(iso: string): number | null {
  if (!iso || !iso.startsWith("PT")) return null
  let seconds = 0
  const h = iso.match(/(\d+)H/)
  const m = iso.match(/(\d+)M/)
  const s = iso.match(/(\d+)S/)
  if (h) seconds += parseInt(h[1], 10) * 3600
  if (m) seconds += parseInt(m[1], 10) * 60
  if (s) seconds += parseInt(s[1], 10)
  return seconds
}
