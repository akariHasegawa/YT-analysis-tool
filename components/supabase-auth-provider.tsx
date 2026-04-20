"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { createBrowserSupabase } from "@/lib/supabase"

type AuthContextValue = {
  supabase: SupabaseClient | null
  session: Session | null
  isLoading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      setSupabase(createBrowserSupabase())
    } catch (e) {
      console.warn("[SupabaseAuthProvider]", e)
      setSupabase(null)
      setIsLoading(false)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
  }, [supabase])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    void (async () => {
      const { data: first } = await supabase.auth.getSession()
      if (cancelled) return

      if (!first.session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.warn("[auth] Anonymous sign-in skipped:", error.message)
        }
      }

      const { data: after } = await supabase.auth.getSession()
      if (!cancelled) {
        setSession(after.session)
        setIsLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      isLoading,
      refreshSession,
    }),
    [supabase, session, isLoading, refreshSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useSupabaseAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider")
  }
  return ctx
}
