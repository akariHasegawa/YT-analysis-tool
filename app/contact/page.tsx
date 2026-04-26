"use client"

import { useState } from "react"
import Link from "next/link"
import type { Metadata } from "next"

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("sending")

    const form = e.currentTarget
    const data = new FormData(form)

    try {
      const res = await fetch("https://formspree.io/f/xojybyvz", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      })

      if (res.ok) {
        setStatus("success")
        form.reset()
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-[#060810] text-gray-300">
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="mb-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            ← トップに戻る
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-white">お問い合わせ</h1>
          <p className="mt-2 text-sm text-gray-500">通常2〜3営業日以内にご返信します</p>
        </div>

        {status === "success" ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-8 text-center">
            <p className="text-lg font-semibold text-green-400">送信完了しました</p>
            <p className="mt-2 text-sm text-gray-400">お問い合わせありがとうございます。返信をお待ちください。</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 text-sm text-gray-500 underline hover:text-gray-300"
            >
              別の内容を送る
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                お名前 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="山田 太郎"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                メールアドレス <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                件名 <span className="text-red-400">*</span>
              </label>
              <select
                name="subject"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0e1120] px-4 py-3 text-sm text-white focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
              >
                <option value="" disabled selected>選択してください</option>
                <option value="プランについて">プランについて</option>
                <option value="返金について">返金について</option>
                <option value="機能の不具合">機能の不具合</option>
                <option value="Chrome拡張機能について">Chrome拡張機能について</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                お問い合わせ内容 <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                required
                rows={6}
                placeholder="詳しい内容をご記入ください"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#6366f1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">送信に失敗しました。時間をおいて再度お試しください。</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "送信中..." : "送信する"}
            </button>
          </form>
        )}

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-gray-600">
          <Link href="/terms" className="hover:text-gray-400">利用規約</Link>
          <span className="mx-3">·</span>
          <Link href="/faq" className="hover:text-gray-400">よくある質問</Link>
        </div>
      </div>
    </div>
  )
}
