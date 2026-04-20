const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const DEFAULT_MAX_RETRIES = 5
const RETRY_AFTER_MAX_MS = 120_000
const BACKOFF_CAP_MS = 45_000

/**
 * chat/completions 呼び出し。429 / 503 のときだけ指数バックオフで数回まで再試行する。
 */
export async function fetchOpenAIChatCompletions(
  apiKey: string,
  body: Record<string, unknown>,
  options?: { maxRetries?: number }
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES
  let last: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    last = res
    if (res.ok) return res

    const retryable = res.status === 429 || res.status === 503
    if (!retryable || attempt === maxRetries) return res

    const headerRaw = res.headers.get("retry-after")
    const headerSec = headerRaw ? parseInt(headerRaw, 10) : NaN
    const fromHeader =
      Number.isFinite(headerSec) && headerSec > 0 ? Math.min(headerSec * 1000, RETRY_AFTER_MAX_MS) : null
    const backoff = Math.min(2000 * 2 ** attempt, BACKOFF_CAP_MS)
    await sleep(fromHeader ?? backoff)
  }

  return last!
}
