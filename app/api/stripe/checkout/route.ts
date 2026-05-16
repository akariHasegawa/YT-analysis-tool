import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAnon } from "@/lib/supabase"
import { getAppBaseUrl, getPriceIdForPlan, getStripe, type BillingPlan } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const plan = (body as { plan?: string })?.plan
  if (plan !== "pro" && plan !== "business") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const authHeader = req.headers.get("authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!accessToken) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "ログインが必要です" }, { status: 401 })
  }

  let authUserId: string | null = null
  let authEmail: string | null = null
  try {
    const anon = createSupabaseAnon()
    const { data, error } = await anon.auth.getUser(accessToken)
    if (error || !data.user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "セッション確認に失敗しました" }, { status: 401 })
    }
    const isAnonymous = Boolean((data.user as { is_anonymous?: boolean }).is_anonymous)
    if (isAnonymous) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "課金には通常ログインが必要です" }, { status: 401 })
    }
    authUserId = data.user.id
    authEmail = data.user.email ?? null
  } catch (e) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: e instanceof Error ? e.message : "認証に失敗しました" },
      { status: 401 }
    )
  }

  const stripe = getStripe()
  const appBase = getAppBaseUrl(req)
  const billingPlan = plan as BillingPlan
  const price = getPriceIdForPlan(billingPlan)

  const couponId = billingPlan === "pro"
    ? process.env.STRIPE_COUPON_PRO_FIRST_MONTH?.trim()
    : process.env.STRIPE_COUPON_BUSINESS_FIRST_MONTH?.trim()

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${appBase}/dashboard?checkout=success`,
      cancel_url: `${appBase}/?checkout=cancelled`,
      client_reference_id: authUserId,
      customer_email: authEmail ?? undefined,
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      metadata: {
        user_id: authUserId,
        plan: billingPlan,
      },
      subscription_data: {
        metadata: {
          user_id: authUserId,
          plan: billingPlan,
        },
      },
    })
  } catch (e) {
    console.error("[stripe/checkout] session create error:", e)
    const message = e instanceof Error ? e.message : "Stripeセッションの作成に失敗しました"
    return NextResponse.json({ error: "STRIPE_ERROR", message }, { status: 500 })
  }

  if (!session.url) {
    return NextResponse.json({ error: "CHECKOUT_URL_NOT_AVAILABLE" }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
