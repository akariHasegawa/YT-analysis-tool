"use client"

import { useState } from "react"
import { X, Chrome, CheckCircle2, ExternalLink } from "lucide-react"

const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/aiai-short-%E5%88%86%E6%9E%90%E3%83%84%E3%83%BC%E3%83%AB/caeiojejmcmbiapdldioggomofdigaij"

export function ExtensionInstallModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-[#6366f1]/40 bg-gradient-to-br from-[#0f1117] to-[#1e1a4f] p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366f1]/20">
            <Chrome className="h-7 w-7 text-[#6366f1]" />
          </div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6366f1]">
            Business プラン特典
          </div>
          <h2 className="text-xl font-bold text-white">Chrome拡張機能を使おう</h2>
          <p className="mt-2 text-sm text-gray-400">
            TikTok・Instagramを見ながら最大5本まとめて分析できます
          </p>
        </div>

        {/* Steps */}
        <div className="mb-6 space-y-3">
          {[
            { num: 1, text: "Chrome拡張機能をインストール" },
            { num: 2, text: "拡張機能のアイコンをクリックしてAIAI-shortと連携" },
            { num: 3, text: "TikTok・Instagramで「＋ リストに追加」を押して分析" },
          ].map(({ num, text }) => (
            <button
              key={num}
              onClick={() => setStep(num as 1 | 2 | 3)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                step === num
                  ? "border-[#6366f1] bg-[#6366f1]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step === num
                    ? "bg-[#6366f1] text-white"
                    : "bg-white/10 text-gray-400"
                }`}
              >
                {num}
              </div>
              <span className={`text-sm font-medium ${step === num ? "text-white" : "text-gray-400"}`}>
                {text}
              </span>
              {step > num && <CheckCircle2 className="ml-auto h-4 w-4 flex-shrink-0 text-[#6366f1]" />}
            </button>
          ))}
        </div>

        {/* Step detail */}
        <div className="mb-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300">
          {step === 1 && (
            <p>Chromeウェブストアからインストールしてください。インストール後、ブラウザ右上に拡張機能のアイコンが表示されます。</p>
          )}
          {step === 2 && (
            <p>拡張機能のアイコンをクリック → 「AIAI-shortで連携する」ボタンを押してログインすると自動で連携されます。</p>
          )}
          {step === 3 && (
            <p>TikTokまたはInstagramで動画を開くと「＋ リストに追加」ボタンが表示されます。最大5本追加して「まとめて分析」を押してください。</p>
          )}
        </div>

        {/* CTA */}
        <a
          href={EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a78bfa] px-4 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)]"
        >
          <Chrome className="h-4 w-4" />
          Chrome拡張機能をインストール
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300"
        >
          あとで確認する →{" "}
          <a href="/extension" className="underline" onClick={onClose}>
            ご案内ページ
          </a>
        </button>
      </div>
    </div>
  )
}
