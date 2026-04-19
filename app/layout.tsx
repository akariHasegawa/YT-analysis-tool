import type { Metadata } from 'next'
import { Noto_Sans_JP, Syne } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LanguageProvider } from '@/lib/language-context'
import { Header } from '@/components/header'
import { NeonBackground } from '@/components/neon-background'
import './globals.css'

const notoSansJp = Noto_Sans_JP({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans-jp',
  display: 'swap',
})

const syne = Syne({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'YT Analysis — バズ構造分析',
  description: 'YouTube動画の構造をAIで分析します。',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="dark">
      <body className={`${notoSansJp.variable} ${syne.variable} font-sans min-h-screen antialiased`}>
        <LanguageProvider>
          <NeonBackground />
          <Header />
          {children}
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  )
}
