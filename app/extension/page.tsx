import type { Metadata } from "next"
import Link from "next/link"
import { Chrome, ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "Chrome拡張機能のご案内 | AIAI-short",
  description: "TikTok・Instagram ReelsをAIで分析するChrome拡張機能の使い方",
}

const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/aiai-short-%E5%88%86%E6%9E%90%E3%83%84%E3%83%BC%E3%83%AB/caeiojejmcmbiapdldioggomofdigaij"

const steps = [
  {
    num: 1,
    title: "Chrome拡張機能をインストール",
    desc: "Chromeウェブストアからインストールしてください。インストール後、ブラウザ右上の拡張機能アイコンをクリックして起動します。",
  },
  {
    num: 2,
    title: "AIAI-shortと連携する",
    desc: "拡張機能を開いて「AIAI-shortで連携する」ボタンを押し、ログインすると自動で連携されます。プランがBusinessと表示されれば準備完了です。",
  },
  {
    num: 3,
    title: "TikTok・Instagramで動画をリストに追加",
    desc: "TikTokまたはInstagramを開くと各動画に「＋ リストに追加」ボタンが表示されます。気になる動画を最大5本まで追加できます。",
  },
  {
    num: 4,
    title: "まとめて分析する",
    desc: "リストに2本以上追加したら「まとめて分析する」ボタンを押すだけ。AIが複数動画のバズパターンを一気に抽出します。",
  },
]

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-[#060810] text-gray-300">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">

        {/* Back */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          ← トップに戻る
        </Link>

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366f1]/20">
            <Chrome className="h-8 w-8 text-[#6366f1]" />
          </div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6366f1]">
            Business プラン限定
          </div>
          <h1 className="text-3xl font-bold text-white">Chrome拡張機能</h1>
          <p className="mt-3 text-gray-400">
            TikTok・Instagram Reelsを見ながら最大5本の動画を<br />
            まとめてAI分析できます
          </p>
        </div>

        {/* Install CTA */}
        <a
          href={EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-12 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a78bfa] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[rgba(99,102,241,0.3)] transition-all hover:shadow-[rgba(99,102,241,0.5)]"
        >
          <Chrome className="h-5 w-5" />
          Chrome拡張機能をインストール
          <ExternalLink className="h-4 w-4 opacity-60" />
        </a>

        {/* Steps */}
        <div className="mb-12 space-y-4">
          <h2 className="text-lg font-bold text-white">使い方</h2>
          {steps.map((s) => (
            <div
              key={s.num}
              className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-sm font-bold text-white">
                {s.num}
              </div>
              <div>
                <div className="font-semibold text-white">{s.title}</div>
                <div className="mt-1 text-sm text-gray-400">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-5 text-sm text-gray-400">
          <div className="mb-2 font-semibold text-[#f59e0b]">ご注意</div>
          <ul className="list-disc space-y-1 pl-4">
            <li>Chrome拡張機能はBusinessプラン限定の機能です</li>
            <li>対応ブラウザはGoogle Chromeのみです</li>
            <li>URLを貼っての分析はYouTubeのみ対応です（TikTok・InstagramはChrome拡張機能をご利用ください）</li>
            <li>まとめて分析は最大5本まで、1回の分析としてカウントされます</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
