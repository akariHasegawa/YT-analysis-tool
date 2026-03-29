'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { useLanguage } from '@/lib/language-context'

export function Header() {
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 border-b border-[oklch(0.55_0.12_270_/_0.18)] bg-[oklch(0.12_0.05_280_/_0.65)] backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.12_0.05_280_/_0.45)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.2_250)] to-[oklch(0.48_0.22_300)] text-[10px] font-bold tracking-tight text-[oklch(0.98_0.01_250)] shadow-[0_0_20px_oklch(0.55_0.2_270_/_0.45)]"
            aria-hidden
          >
            AI
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{t('header.title')}</h1>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
