import type { SupabaseClient } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "@/lib/supabase"

export type UserPlan = "free" | "pro" | "business"

export type UserUsageRow = {
  id: string
  email: string | null
  plan: UserPlan
  analysis_count_total: number
  analysis_count_month: number
  usage_month: string | null
}

/** UTC のカレンダー月 YYYY-MM（DB の usage_month と一致） */
export function currentUsageMonthUtc(): string {
  return new Date().toISOString().slice(0, 7)
}

export function effectiveMonthlyCount(row: Pick<UserUsageRow, "usage_month" | "analysis_count_month">): number {
  const ym = currentUsageMonthUtc()
  const stored = row.usage_month?.trim() ?? ""
  return stored === ym ? row.analysis_count_month : 0
}

export function remainingAnalysesForPlan(
  plan: UserPlan,
  total: number,
  effectiveMonth: number
): number {
  if (plan === "free") return Math.max(0, 1 - total)
  if (plan === "pro") return Math.max(0, 30 - effectiveMonth)
  return Math.max(0, 100 - effectiveMonth)
}

export type LimitCheckResult =
  | { ok: true; profile: UserUsageRow }
  | { ok: false; plan: UserPlan; reason: "LIMIT_EXCEEDED" }

export function checkAnalysisLimit(profile: UserUsageRow): LimitCheckResult {
  const plan = profile.plan
  const total = profile.analysis_count_total ?? 0
  const month = effectiveMonthlyCount(profile)

  if (plan === "free") {
    if (total >= 1) return { ok: false, plan: "free", reason: "LIMIT_EXCEEDED" }
    return { ok: true, profile }
  }
  if (plan === "pro") {
    if (month >= 30) return { ok: false, plan: "pro", reason: "LIMIT_EXCEEDED" }
    return { ok: true, profile }
  }
  if (month >= 100) return { ok: false, plan: "business", reason: "LIMIT_EXCEEDED" }
  return { ok: true, profile }
}

export async function fetchUserUsageRow(
  admin: SupabaseClient,
  userId: string,
  emailFallback: string | null
): Promise<UserUsageRow | null> {
  const { data, error } = await admin.from("users").select("*").eq("id", userId).maybeSingle()
  if (error) {
    console.error("[analysis-usage] fetch users row", error)
    return null
  }
  if (data) {
    return data as UserUsageRow
  }
  const { error: insertError } = await admin.from("users").insert({
    id: userId,
    email: emailFallback,
    plan: "free",
    analysis_count_total: 0,
    analysis_count_month: 0,
    usage_month: currentUsageMonthUtc(),
  })
  if (insertError && insertError.code !== "23505") {
    console.error("[analysis-usage] insert users row", insertError)
    return null
  }
  const { data: again } = await admin.from("users").select("*").eq("id", userId).maybeSingle()
  return (again as UserUsageRow) ?? null
}

/**
 * 分析成功後に呼ぶ。service_role で users を直接更新する（RPC 未デプロイや PostgREST の挙動差でも確実に +1）。
 */
export async function incrementUserAnalysisCounts(admin: SupabaseClient, userId: string): Promise<void> {
  const ym = currentUsageMonthUtc()
  const { data: row, error: fetchError } = await admin.from("users").select("*").eq("id", userId).maybeSingle()
  if (fetchError || !row) {
    console.error("[analysis-usage] increment fetch users row failed", fetchError)
    return
  }
  const r = row as UserUsageRow
  const nextMonth = r.usage_month === ym ? r.analysis_count_month + 1 : 1
  const { error: upError } = await admin
    .from("users")
    .update({
      analysis_count_total: r.analysis_count_total + 1,
      analysis_count_month: nextMonth,
      usage_month: ym,
    })
    .eq("id", userId)
  if (upError) console.error("[analysis-usage] increment update failed", upError)
}

export function assertSupabaseForAnalyze(): { ok: true } | { ok: false; status: 503; body: object } {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      body: { error: "SUPABASE_NOT_CONFIGURED", message: "Supabase 環境変数を設定してください。" },
    }
  }
  return { ok: true }
}

/** `.env.local` に `DISABLE_ANALYSIS_LIMIT=true` で開発時のみ回数チェックをスキップ（本番では未設定のまま） */
export function isAnalysisLimitDisabled(): boolean {
  return process.env.DISABLE_ANALYSIS_LIMIT === "true"
}
