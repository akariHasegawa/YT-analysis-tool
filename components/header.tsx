'use client'

interface HeaderProps {
  onPricingClick?: () => void
  onGetStartedClick?: () => void
  onLoginClick?: () => void
}

export function Header({ onPricingClick, onGetStartedClick, onLoginClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(99,102,241,0.1)] bg-[#060810] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[11px] font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            AI
          </div>
          <h1 className="text-sm font-semibold text-white sm:text-base">バズ構造分析</h1>
        </div>

        {/* Right: Pricing Link + Get Started Button + Login */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={onPricingClick}
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            料金プラン
          </button>
          <button
            onClick={onGetStartedClick}
            className="rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)] sm:px-6"
          >
            無料で試す
          </button>
          <button
            onClick={onLoginClick}
            className="rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgba(99,102,241,0.4)] sm:px-6"
          >
            ログイン
          </button>
        </div>
      </div>
    </header>
  )
}
