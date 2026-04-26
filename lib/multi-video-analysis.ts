export type MultiVideoSummary = {
  url: string
  title: string
  keyFeature: string
}

export type MultiVideoAnalysis = {
  commonHookPatterns: string[]
  commonEmotionPatterns: string[]
  commonStructure: string
  commonCTAPatterns: string[]
  keySuccessFactors: string[]
  nextVideoIdeas: string[]
  scriptPrompt: string
  videoPrompt: string
  videoSummaries: MultiVideoSummary[]
}
