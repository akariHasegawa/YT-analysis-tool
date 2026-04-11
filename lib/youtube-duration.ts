/** YouTube Data API の contentDetails.duration（ISO 8601、例 PT47S, PT1M30S, PT1M5.5S）を秒に変換 */
export function parseIso8601DurationSeconds(iso: string): number | null {
  if (!iso || !iso.startsWith("PT")) return null
  let seconds = 0
  const h = iso.match(/(\d+(?:\.\d+)?)H/)
  const m = iso.match(/(\d+(?:\.\d+)?)M/)
  const s = iso.match(/(\d+(?:\.\d+)?)S/)
  if (h) seconds += parseFloat(h[1]) * 3600
  if (m) seconds += parseFloat(m[1]) * 60
  if (s) seconds += parseFloat(s[1])
  return Number.isFinite(seconds) ? seconds : null
}
