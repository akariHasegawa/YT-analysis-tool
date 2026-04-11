import { z } from "zod"

/** GAS 保存専用。UI には出さない。 */
export const structureTimelineFieldKeys = [
  "hookStartSec",
  "hookEndSec",
  "problemStartSec",
  "problemEndSec",
  "developmentStartSec",
  "developmentEndSec",
  "endingStartSec",
  "endingEndSec",
  "ctaStartSec",
  "ctaEndSec",
  "structureTimeline",
  "structureMemo",
] as const

export type StructureTimelineFields = Record<(typeof structureTimelineFieldKeys)[number], string>

export const emptyStructureTimelineFields = (): StructureTimelineFields => ({
  hookStartSec: "",
  hookEndSec: "",
  problemStartSec: "",
  problemEndSec: "",
  developmentStartSec: "",
  developmentEndSec: "",
  endingStartSec: "",
  endingEndSec: "",
  ctaStartSec: "",
  ctaEndSec: "",
  structureTimeline: "",
  structureMemo: "",
})

const timelineAiSchema = z.object({
  hookStartSec: z.string().optional(),
  hookEndSec: z.string().optional(),
  problemStartSec: z.string().optional(),
  problemEndSec: z.string().optional(),
  developmentStartSec: z.string().optional(),
  developmentEndSec: z.string().optional(),
  endingStartSec: z.string().optional(),
  endingEndSec: z.string().optional(),
  ctaStartSec: z.string().optional(),
  ctaEndSec: z.string().optional(),
  structureTimeline: z.string().optional(),
  structureMemo: z.string().optional(),
})

function normalizeTimeline(raw: z.infer<typeof timelineAiSchema>): StructureTimelineFields {
  const base = emptyStructureTimelineFields()
  for (const k of structureTimelineFieldKeys) {
    const v = raw[k]
    base[k] = typeof v === "string" ? v.trim() : ""
  }
  return base
}

/** 秒単位の数値文字列のみ許可（ミリ秒整数列や科学記数法は不可。小数は最大2桁まで） */
function parseSecondsStrict(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * AI が字幕のミリ秒を秒と誤って転写した数値を救済する。
 * 動画長が分かり、値が長さの数倍を超えるときは 1/1000 秒として解釈し直す。
 */
function maybeRescaleMisreadMilliseconds(n: number, durationSec: number | null): number {
  if (!Number.isFinite(n) || n < 0) return n
  if (durationSec != null && durationSec > 0 && n > durationSec * 4) {
    const scaled = n / 1000
    if (scaled <= durationSec + 30) return scaled
  }
  return n
}

function formatSecondsForStorage(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded)
}

function cleanPair(
  startStr: string,
  endStr: string,
  durationSec: number | null
): [string, string] {
  let s = parseSecondsStrict(startStr)
  let e = parseSecondsStrict(endStr)
  if (s === null && e === null) return ["", ""]
  if (s === null || e === null) return ["", ""]
  s = maybeRescaleMisreadMilliseconds(s, durationSec)
  e = maybeRescaleMisreadMilliseconds(e, durationSec)
  if (s > e) return ["", ""]
  if (durationSec != null && Number.isFinite(durationSec) && durationSec >= 0) {
    if (s > durationSec || e > durationSec) return ["", ""]
  }
  return [formatSecondsForStorage(s), formatSecondsForStorage(e)]
}

/**
 * 保存用JSON向け。開始≦終了・動画長以下・秒単位表記を強制。不整合は空文字。
 * （UI には使わない）
 */
export function sanitizeStructureTimelineFields(
  fields: StructureTimelineFields,
  durationSec: number | null
): StructureTimelineFields {
  const out: StructureTimelineFields = { ...fields }

  const pairs: Array<[keyof StructureTimelineFields, keyof StructureTimelineFields]> = [
    ["hookStartSec", "hookEndSec"],
    ["problemStartSec", "problemEndSec"],
    ["developmentStartSec", "developmentEndSec"],
    ["endingStartSec", "endingEndSec"],
    ["ctaStartSec", "ctaEndSec"],
  ]

  for (const [a, b] of pairs) {
    const [sa, sb] = cleanPair(out[a], out[b], durationSec)
    out[a] = sa
    out[b] = sb
  }

  out.structureTimeline = typeof out.structureTimeline === "string" ? out.structureTimeline.trim() : ""
  out.structureMemo = typeof out.structureMemo === "string" ? out.structureMemo.trim() : ""

  return out
}

const TIMELINE_SYSTEM = `あなたは動画の構成分析者です。与えられるのは「秒付きの字幕テキスト」のみです。映像は見ません。
字幕の [開始秒-終了秒] を手がかりに、おおよその区間を推定してください。

必ず日本語で、次のキーだけを持つ1つのJSONオブジェクトのみを返すこと（前後に説明やマークダウンを付けない）。

- hookStartSec, hookEndSec: フック（冒頭の注意引き）のおおよその開始・終了秒。不明なら ""
- problemStartSec, problemEndSec: 問題提起・課題提示の区間。不明なら ""
- developmentStartSec, developmentEndSec: 展開・解説・本題の区間。不明なら ""
- endingStartSec, endingEndSec: 締め・まとめの区間。不明なら ""
- ctaStartSec, ctaEndSec: CTA・フォロー誘導などの区間。不明なら ""
- structureTimeline: 全体の時系列を日本語で簡潔に（1〜5文）
- structureMemo: 補足メモ（任意、1〜3文）。不要なら ""

秒数フィールドの厳守ルール（違反する値は後段で破棄されるため、最初から守ること）:
- 単位は「秒」のみ。ミリ秒の整数（例: 1500 ＝ 1.5秒のつもり）は禁止。必ず秒で "1.5" のように書く。
- 値は非負の数値文字列のみ。小数は小数点以下最大2桁（例 "3", "3.5", "12.25"）。指数表記・カンマ区切りは禁止。
- 各ペアで必ず 開始秒 ≦ 終了秒。動画の総秒数（ユーザーに渡す参考値）を超える秒は書かない。
- 不明・矛盾する場合は空文字 "" にする。`

export async function inferStructureTimelineFromTranscript(options: {
  apiKey: string
  model: string
  transcript: string
  title: string
  channelName: string
  durationSec: number | null
}): Promise<StructureTimelineFields> {
  const { apiKey, model, transcript, title, channelName, durationSec } = options

  const userBlock = `動画タイトル: ${title}
チャンネル名: ${channelName}
動画の長さ(秒・参考): ${durationSec != null ? String(durationSec) : "不明"}

--- 字幕（秒付き） ---
${transcript}`

  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: TIMELINE_SYSTEM },
          { role: "user", content: userBlock },
        ],
      }),
    })
  } catch {
    return emptyStructureTimelineFields()
  }

  if (!res.ok) {
    return emptyStructureTimelineFields()
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    return emptyStructureTimelineFields()
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(content)
  } catch {
    return emptyStructureTimelineFields()
  }

  const parsed = timelineAiSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return emptyStructureTimelineFields()
  }

  const normalized = normalizeTimeline(parsed.data)
  return sanitizeStructureTimelineFields(normalized, durationSec)
}
