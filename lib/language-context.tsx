'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'ja' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  ja: {
    'title': 'YouTube動画構造分析ツール',
    'description': 'YouTube動画の構造をAIで分析します',
    'input.heading': '動画を分析する',
    'input.label': 'YouTube動画のURLを入力してください',
    'input.placeholder': 'https://youtube.com/watch?v=... または https://youtube.com/shorts/...',
    'input.videoType': '動画タイプ',
    'input.videoType.short': 'ショート動画',
    'input.videoType.regular': '通常動画',
    'input.error.required': 'URLを入力してください',
    'input.error.invalidYoutube': '有効な YouTube のURLを入力してください',
    'input.footerNote': 'アカウント不要。まず動画情報が表示され、続けてAI分析が行われます。',
    'input.button': 'AIで分析する',
    'input.samples': 'サンプル動画を試す:',
    'input.sample1': 'サンプル 1',
    'input.sample2': 'サンプル 2',
    'input.sample3': 'サンプル 3',
    'processing.title': '動画を分析中...ちょっと待ってね',
    'processing.step1': 'AIモデルを初期化中',
    'processing.step2': '動画メタデータを取得中',
    'processing.step3': 'コンテンツを分析中',
    'processing.step4': 'レポートを生成中',
    'processing.progress': '進捗',
    'processing.error.analyzeFailed': '分析に失敗しました',
    'processing.error.analyzeEmpty': '分析結果を取得できませんでした',
    'results.title': '分析結果',
    'results.videoInfo': '動画情報',
    'results.views': '再生回数',
    'results.titleUnknown': 'タイトル未取得',
    'results.channelUnknown': 'チャンネル名未取得',
    'results.statUnavailable': '未取得',
    'results.likes': 'いいね',
    'results.duration': '再生時間',
    'results.trendScore': 'トレンドスコア',
    'results.aiAnalysis': 'AI構造分析',
    'results.analyzing': '分析中…',
    'results.hook': 'フック',
    'results.emotion': 'エモーション',
    'results.structure': 'ストラクチャー',
    'results.cta': 'CTA',
    'results.retention': 'リテンション',
    'results.hook.value': '質問型フック',
    'results.hook.desc': '冒頭で挑発的な質問を投げかけ、視聴者の注意を瞬時に引きつけます。',
    'results.emotion.value': '好奇心 + 不安',
    'results.emotion.desc': '2つの感情を同時に刺激し、最後まで視聴させる効果があります。',
    'results.structure.value': '課題 → 解決型',
    'results.structure.desc': '問題提起から解決策の提示まで、3幕構成で展開しています。',
    'results.cta.value': 'フォロー誘導型',
    'results.cta.desc': '押し付けがましくないソフトなCTAでフォロワー増加を促進します。',
    'results.retention.value': '72% — 高評価',
    'results.retention.desc': '構成パターンから予測される視聴維持率は平均以上です。',
    'results.improvements': '改善提案',
    'results.improvementsTitle': '改善アイデア',
    'results.improvement1': '最初の3秒でフックを改善 — 結果を先に見せることを検討。',
    'results.improvement2': 'より個人的なストーリーで感情的なトリガーを強化。',
    'results.improvement3': '20秒時点でより明確なCTAを追加。最後だけでなく。',
    'results.improvement4': 'ミュート視聴者のために画面上のテキストで重要ポイントを強調。',
    'results.improvement5': '中間部分を4〜5秒トリミングしてテンポを引き締める。',
    'results.ideas': '次の動画アイデア',
    'results.ideasTitle': '次に試すべき動画コンセプト',
    'results.idea1': '「初心者がやりがちな3つの間違い」',
    'results.idea2': '「これを30日間試したらどうなる？」',
    'results.idea3': '「予想外の結果実験 — #3は信じられない」',
    'results.idea4': '「誰も教えてくれない60秒バージョン」',
    'results.nextVideo': '次の動画を分析',
    'results.newAnalysis': '新しい分析',
    'header.language': '言語',
  },
  en: {
    'title': 'YouTube Video Structure Analyzer',
    'description': 'Analyze the structure of YouTube videos using AI.',
    'input.heading': 'Analyze a Video',
    'input.label': 'Enter a YouTube video URL',
    'input.placeholder': 'https://youtube.com/watch?v=... or https://youtube.com/shorts/...',
    'input.videoType': 'Video Type',
    'input.videoType.short': 'Shorts',
    'input.videoType.regular': 'Regular Video',
    'input.error.required': 'Please enter a URL',
    'input.error.invalidYoutube': 'Please enter a valid YouTube URL',
    'input.footerNote': 'No account required. Video details appear first, then AI analysis runs.',
    'input.button': 'Analyze with AI',
    'input.samples': 'Try sample videos:',
    'input.sample1': 'Sample 1',
    'input.sample2': 'Sample 2',
    'input.sample3': 'Sample 3',
    'processing.title': 'Analyzing Video...',
    'processing.fetchingMetadata': 'Fetching video information…',
    'processing.step1': 'Initializing AI model',
    'processing.step2': 'Fetching video metadata',
    'processing.step3': 'Analyzing content',
    'processing.step4': 'Generating report',
    'processing.progress': 'Progress',
    'processing.error.analyzeFailed': 'Analysis failed',
    'processing.error.analyzeEmpty': 'Could not retrieve analysis results',
    'results.title': 'Analysis Results',
    'results.videoInfo': 'Video Information',
    'results.views': 'Views',
    'results.titleUnknown': 'Title unavailable',
    'results.channelUnknown': 'Channel unavailable',
    'results.statUnavailable': '—',
    'results.likes': 'Likes',
    'results.duration': 'Duration',
    'results.trendScore': 'Trend Score',
    'results.aiAnalysis': 'AI Structure Analysis',
    'results.analyzing': 'Analyzing…',
    'results.hook': 'Hook Type',
    'results.emotion': 'Emotion Type',
    'results.structure': 'Structure Type',
    'results.cta': 'CTA Type',
    'results.retention': 'Retention Prediction',
    'results.hook.value': 'Question Hook',
    'results.hook.desc': 'Opens with a provocative question to instantly grab attention.',
    'results.emotion.value': 'Curiosity + Fear',
    'results.emotion.desc': 'Triggers dual emotional response for maximum watch-through.',
    'results.structure.value': 'Problem → Solution',
    'results.structure.desc': 'Classic 3-act structure: pain point, buildup, resolution.',
    'results.cta.value': 'Follow for More',
    'results.cta.desc': 'Soft CTA driving follower growth without friction.',
    'results.retention.value': '72% — High',
    'results.retention.desc': 'Estimated above-average retention based on structure patterns.',
    'results.improvements': 'Improvement Suggestions',
    'results.improvementsTitle': 'Improvement Ideas',
    'results.improvement1': 'Improve hook in the first 3 seconds — consider showing the outcome first.',
    'results.improvement2': 'Increase emotional trigger with a more personal story angle.',
    'results.improvement3': 'Add a clearer CTA at the 20-second mark, not just the end.',
    'results.improvement4': 'Use on-screen text to reinforce key points for muted viewers.',
    'results.improvement5': 'Trim the middle section by 4–5 seconds to tighten pacing.',
    'results.ideas': 'Next Video Ideas',
    'results.ideasTitle': 'Video Concepts to Try Next',
    'results.idea1': '"3 mistakes beginners make with this"',
    'results.idea2': '"What happens if you try this for 30 days?"',
    'results.idea3': '"Unexpected result experiment — you won\'t believe #3"',
    'results.idea4': '"The 60-second version nobody told you about"',
    'results.nextVideo': 'Analyze Next Video',
    'results.newAnalysis': 'New Analysis',
    'header.language': 'Language',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ja')

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
