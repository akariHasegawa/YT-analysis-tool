import { NextResponse } from "next/server"
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase"

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ totalAnalyses: 0 })
  }

  try {
    const admin = createSupabaseAdmin()
    const { data: rpcData, error: rpcError } = await admin.rpc("get_total_analysis_count")
    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      let n = 0
      if (typeof rpcData === "number") n = rpcData
      else if (typeof rpcData === "string") n = Number(rpcData)
      else if (Array.isArray(rpcData) && rpcData.length > 0) n = Number(rpcData[0])
      else n = Number(rpcData)
      if (!Number.isNaN(n)) {
        return NextResponse.json({ totalAnalyses: n })
      }
    }

    const { data: rows, error } = await admin.from("users").select("analysis_count_total")
    if (error) {
      console.error("[api/stats] select users", error)
      return NextResponse.json({ totalAnalyses: 0 })
    }
    const sum = (rows ?? []).reduce((acc, r) => acc + (Number(r.analysis_count_total) || 0), 0)
    return NextResponse.json({ totalAnalyses: sum })
  } catch (e) {
    console.error("[api/stats]", e)
    return NextResponse.json({ totalAnalyses: 0 })
  }
}
