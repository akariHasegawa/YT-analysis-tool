import Stripe from "stripe"

// "creator" = クリエイタープラン (¥5,980/月), "business" = ビジネスプラン (¥19,800/月)
export type BillingPlan = "creator" | "business"

export const CREATOR_PRICE_ID = process.env.STRIPE_PRICE_CREATOR_MONTHLY?.trim() ?? ""
export const BUSINESS_PRICE_ID = process.env.STRIPE_PRICE_BUSINESS_MONTHLY?.trim() ?? ""

/** Price IDs that grant access to AIAI-short */
export const VALID_PRICE_IDS = [CREATOR_PRICE_ID, BUSINESS_PRICE_ID].filter(Boolean)

let stripeClient: Stripe | null = null

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`${name} is not set`)
  return v
}

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient
  stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-03-31.basil",
  })
  return stripeClient
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET")
}

export function getPriceIdForPlan(plan: BillingPlan): string {
  if (plan === "creator") return requireEnv("STRIPE_PRICE_CREATOR_MONTHLY")
  return requireEnv("STRIPE_PRICE_BUSINESS_MONTHLY")
}

/** Returns internal plan stored in users.plan ("pro" = creator for backward compat) */
export function planFromPriceId(priceId: string | null | undefined): "pro" | "business" | null {
  if (!priceId) return null
  if (CREATOR_PRICE_ID && priceId === CREATOR_PRICE_ID) return "pro"
  if (BUSINESS_PRICE_ID && priceId === BUSINESS_PRICE_ID) return "business"
  return null
}

/** Returns display plan name */
export function billingPlanFromPriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) return null
  if (CREATOR_PRICE_ID && priceId === CREATOR_PRICE_ID) return "creator"
  if (BUSINESS_PRICE_ID && priceId === BUSINESS_PRICE_ID) return "business"
  return null
}

export function getAppBaseUrl(req?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const fromReq = req ? new URL(req.url).origin : null
  if (fromReq) return fromReq
  return "http://localhost:3000"
}
