import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdmin, createSupabaseAnon } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!accessToken) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const anon = createSupabaseAnon()
  const { data, error } = await anon.auth.getUser(accessToken)
  if (error || !data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  const admin = createSupabaseAdmin()
  const { data: userData } = await admin
    .from("users")
    .select("plan, analysis_count_month")
    .eq("id", data.user.id)
    .single()

  return NextResponse.json({
    plan: userData?.plan ?? "free",
    analysis_count_month: userData?.analysis_count_month ?? 0,
  })
}
