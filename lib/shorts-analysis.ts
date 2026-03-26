import { z } from "zod"

export const shortsAnalysisSchema = z.object({
  hook: z.object({
    value: z.string(),
    description: z.string(),
  }),
  emotion: z.object({
    value: z.string(),
    description: z.string(),
  }),
  cta: z.object({
    value: z.string(),
    description: z.string(),
  }),
  structure: z.object({
    value: z.string(),
    description: z.string(),
  }),
  retention: z.object({
    value: z.string(),
    description: z.string(),
  }),
  improvementIdeas: z.array(z.string()),
  nextVideoIdeas: z.array(z.string()),
})

export type ShortsAnalysis = z.infer<typeof shortsAnalysisSchema>

export function normalizeShortsAnalysis(raw: ShortsAnalysis): ShortsAnalysis {
  const pad = (arr: string[], len: number, filler: string) => {
    const out = [...arr].slice(0, len)
    while (out.length < len) out.push(filler)
    return out
  }
  return {
    ...raw,
    improvementIdeas: pad(raw.improvementIdeas, 5, "（追記なし）"),
    nextVideoIdeas: pad(raw.nextVideoIdeas, 4, "（追記なし）"),
  }
}
