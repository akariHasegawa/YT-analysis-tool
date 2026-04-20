import { Suspense } from "react"
import { AuthCallbackClient } from "./auth-callback-client"

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">ログイン処理中…</p>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  )
}
