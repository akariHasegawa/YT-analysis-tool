"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Mail, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  /** メール／Google の認証が完了したとき */
  onAuthSuccess: () => void
}

export function SignupModal({ isOpen, onClose, onAuthSuccess }: SignupModalProps) {
  const { t } = useLanguage()
  const { supabase } = useSupabaseAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isLoading, setIsLoading] = useState<"google" | "email" | null>(null)
  const [isLoginMode, setIsLoginMode] = useState(false)

  if (!isOpen) return null

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleGoogleSignup = async () => {
    if (!supabase) {
      setEmailError(t("signup.error.supabase") || "Supabase が未設定です")
      return
    }
    setIsLoading("google")
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    })
    setIsLoading(null)
    if (error) {
      setEmailError(error.message)
      return
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setEmailError(t("signup.error.supabase") || "Supabase が未設定です")
      return
    }
    if (!email.trim()) {
      setEmailError(t("signup.error.required") || "メールアドレスを入力してください")
      return
    }
    if (!validateEmail(email.trim())) {
      setEmailError(t("signup.error.invalid") || "有効なメールアドレスを入力してください")
      return
    }
    if (password.length < 6) {
      setPasswordError(t("signup.error.passwordLength") || "パスワードは6文字以上にしてください")
      return
    }
    setEmailError("")
    setPasswordError("")
    setIsLoading("email")
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = isLoginMode
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${origin}/auth/callback` } })
    setIsLoading(null)
    if (error) {
      setEmailError(error.message)
      return
    }
    onAuthSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 py-8 sm:p-6">
        <div
          className="absolute inset-0 bg-[oklch(0.08_0.04_280_/_0.85)] backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />

        <div className="relative z-10 my-auto w-full max-w-md max-h-[90vh] animate-fade-up">
          <div className="glass-card neon-card-glow flex max-h-[90vh] flex-col overflow-hidden rounded-2xl">
            <div className="relative min-h-0 max-h-[90vh] flex-1 overflow-y-auto overscroll-contain p-6 pt-12 sm:p-8 sm:pt-14">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[oklch(0.3_0.08_270_/_0.4)] hover:text-foreground sm:right-4 sm:top-4"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.2_260)] to-[oklch(0.5_0.22_285)]">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h2 className="mb-2 font-display text-lg font-bold leading-snug text-foreground sm:text-xl">
                  {isLoginMode ? "ログイン" : "結果を保存・続けて使うには登録を"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  分析結果はこのまま表示されたままです。閉じても結果は消えません。無料でメールまたは Google から続けられます。
                </p>
              </div>

              <div className="mb-8 rounded-xl border border-[oklch(0.4_0.08_270_/_0.2)] bg-[oklch(0.14_0.04_280_/_0.5)] p-4">
                <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
                  バズ構造分析でできること
                </p>
                <ul className="space-y-2">
                  {[
                    "バズった動画の構造を解析",
                    "改善提案と次の動画アイデア",
                    "台本・動画プロンプトを自動生成",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[oklch(0.35_0.12_270_/_0.5)] text-xs text-[oklch(0.8_0.14_260)]">
                        {i + 1}
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading !== null}
                className={cn(
                  "mb-4 h-12 w-full rounded-xl border-0 bg-white font-semibold text-gray-900 transition-all",
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
                Googleでログイン
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[oklch(0.45_0.08_270_/_0.3)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="rounded bg-[oklch(0.14_0.04_280_/_0.95)] px-3 text-muted-foreground">または</span>
                </div>
              </div>

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
                  <Input
                    type="password"
                    placeholder={t("signup.passwordPlaceholder") || "パスワード（6文字以上）"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (passwordError) setPasswordError("")
                    }}
                    disabled={isLoading !== null}
                    autoComplete="new-password"
                    className="h-12 rounded-xl border-[oklch(0.5_0.1_270_/_0.3)] bg-[oklch(0.12_0.05_280_/_0.55)] text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[oklch(0.65_0.16_250)] focus-visible:ring-[oklch(0.55_0.18_270_/_0.35)]"
                  />
                  {emailError && <p className="text-sm text-[oklch(0.72_0.18_25)]">{emailError}</p>}
                  {passwordError && <p className="text-sm text-[oklch(0.72_0.18_25)]">{passwordError}</p>}
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
                  {isLoading === "email" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isLoginMode ? "ログイン" : "メールで登録"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setIsLoginMode(!isLoginMode); setEmailError(""); setPasswordError("") }}
                className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLoginMode ? "アカウントをお持ちでない方は新規登録" : "すでにアカウントをお持ちの方はログイン"}
              </button>

              <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
                {t("signup.terms") || "登録することで、利用規約とプライバシーポリシーに同意したものとみなされます。"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
