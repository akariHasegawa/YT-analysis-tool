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

export const structureTimelineAiSchema = z.object({
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

function normalizeTimeline(raw: z.infer<typeof structureTimelineAiSchema>): StructureTimelineFields {
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

/** メイン分析と同一レスポンス内の structureTimeline ブロックをパースする（OpenAI 専用呼び出しは行わない） */
export function parseStructureTimelineFromAiPartial(
  raw: unknown,
  durationSec: number | null
): StructureTimelineFields {
  if (raw == null || (typeof raw === "object" && Object.keys(raw as object).length === 0)) {
    return sanitizeStructureTimelineFields(emptyStructureTimelineFields(), durationSec)
  }
  const parsed = structureTimelineAiSchema.safeParse(raw)
  if (!parsed.success) {
    return sanitizeStructureTimelineFields(emptyStructureTimelineFields(), durationSec)
  }
  const normalized = normalizeTimeline(parsed.data)
  return sanitizeStructureTimelineFields(normalized, durationSec)
}
