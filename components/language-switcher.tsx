'use client'

import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-xl border border-transparent text-muted-foreground transition-all hover:border-[oklch(0.55_0.14_270_/_0.35)] hover:bg-[oklch(0.22_0.06_280_/_0.4)] hover:text-foreground hover:shadow-[0_0_16px_oklch(0.5_0.15_270_/_0.2)]"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">
            {language === 'ja' ? '日本語' : 'English'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-card neon-card-glow min-w-[10rem] rounded-xl border-[oklch(0.55_0.14_270_/_0.25)] bg-[oklch(0.16_0.06_280_/_0.85)] p-1"
      >
        <DropdownMenuItem
          onClick={() => setLanguage('ja')}
          className={`cursor-pointer rounded-lg ${language === 'ja' ? 'bg-[oklch(0.45_0.15_270_/_0.35)] text-foreground' : ''}`}
        >
          日本語
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={`cursor-pointer rounded-lg ${language === 'en' ? 'bg-[oklch(0.45_0.15_270_/_0.35)] text-foreground' : ''}`}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
