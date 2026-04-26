'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface FooterCTAProps {
  onGetStarted: () => void
}

export function FooterCTA({ onGetStarted }: FooterCTAProps) {
  return (
    <section className="flex flex-col items-center justify-center px-4 py-10 sm:py-16 text-center">
      <h2 className="font-display whitespace-nowrap text-xl font-bold text-white sm:text-3xl">
        まずは無料で試してみてください。
      </h2>
      <p className="mt-4 text-sm text-gray-400 sm:text-base">
        クレジットカード不要。1回の分析で価値がわかります。
      </p>

      <button
        onClick={onGetStarted}
        className="group mt-8 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-8 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)]"
      >
        すぐに分析してみる
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
      <div className="mt-12 flex items-center gap-4 text-xs text-gray-600">
        <Link href="/terms" className="transition-colors hover:text-gray-400">利用規約</Link>
        <span>·</span>
        <Link href="/faq" className="transition-colors hover:text-gray-400">よくある質問</Link>
        <span>·</span>
        <Link href="/contact" className="transition-colors hover:text-gray-400">お問い合わせ</Link>
      </div>
    </section>
  )
}
