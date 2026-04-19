"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Mail, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSignup: (method: "google" | "email", email?: string) => void
}

export function SignupModal({ isOpen, onClose, onSignup }: SignupModalProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState<"google" | "email" | null>(null)

  if (!isOpen) return null

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleGoogleSignup = async () => {
    setIsLoading("google")
    // Simulated delay for demo - will be replaced with actual auth
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSignup("google")
    setIsLoading(null)
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setEmailError(t("signup.error.required") || "メールアドレスを入力してください")
      return
    }
    if (!validateEmail(email.trim())) {
      setEmailError(t("signup.error.invalid") || "有効なメールアドレスを入力してください")
      return
    }
    setEmailError("")
    setIsLoading("email")
    // Simulated delay for demo - will be replaced with actual auth
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSignup("email", email)
    setIsLoading(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[oklch(0.08_0.04_280_/_0.85)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="glass-card neon-card-glow rounded-2xl p-6 sm:p-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[oklch(0.3_0.08_270_/_0.4)] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.2_260)] to-[oklch(0.5_0.22_285)]">
                <Mail className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="mb-2 font-display text-xl font-bold text-foreground sm:text-2xl">
              {t("signup.title") || "分析結果を保存"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("signup.subtitle") || "続けて使うには無料登録を"}
            </p>
          </div>

          {/* Features preview */}
          <div className="mb-8 rounded-xl bg-[oklch(0.14_0.04_280_/_0.5)] p-4 border border-[oklch(0.4_0.08_270_/_0.2)]">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("signup.features.title") || "登録で利用可能に"}
            </p>
            <ul className="space-y-2">
              {[
                t("signup.feature1") || "分析結果の保存・履歴閲覧",
                t("signup.feature2") || "月30回までの分析（Pro）",
                t("signup.feature3") || "台本・動画プロンプト生成",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.35_0.12_270_/_0.5)] text-xs text-[oklch(0.8_0.14_260)]">
                    {i + 1}
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Google signup */}
          <Button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading !== null}
            className={cn(
              "mb-4 h-12 w-full rounded-xl border-0 bg-white text-gray-900 font-semibold transition-all",
              "hover:bg-gray-100 hover:shadow-lg",
              isLoading === "google" && "opacity-70"
            )}
          >
            {isLoading === "google" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t("signup.google") || "Googleで登録"}
          </Button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[oklch(0.45_0.08_270_/_0.3)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">
                {t("signup.or") || "または"}
              </span>
            </div>
          </div>

          {/* Email signup */}
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder={t("signup.emailPlaceholder") || "メールアドレス"}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError("")
                }}
                disabled={isLoading !== null}
                className="h-12 rounded-xl border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.05_280_/_0.55)] text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[oklch(0.65_0.16_250)] focus-visible:ring-[oklch(0.55_0.18_270_/_0.35)]"
              />
              {emailError && <p className="text-sm text-[oklch(0.72_0.18_25)]">{emailError}</p>}
            </div>
            <Button
              type="submit"
              disabled={isLoading !== null}
              className={cn(
                "h-12 w-full rounded-xl border-0 text-base font-semibold",
                "bg-gradient-to-r from-[oklch(0.55_0.2_260)] to-[oklch(0.52_0.22_285)]",
                "text-white hover:shadow-[0_8px_32px_oklch(0.5_0.2_270_/_0.4)]",
                isLoading === "email" && "opacity-70"
              )}
            >
              {isLoading === "email" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {t("signup.email") || "メールで登録"}
            </Button>
          </form>

          {/* Terms */}
          <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
            {t("signup.terms") || "登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。"}
          </p>
        </div>
      </div>
    </div>
  )
}
