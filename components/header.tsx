'use client'

import { LanguageSwitcher } from '@/components/language-switcher'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <h1 className="text-lg font-bold text-foreground">AI Shorts</h1>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
