import Stripe from "stripe"

export type BillingPlan = "pro" | "business"

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
  if (plan === "pro") return requireEnv("STRIPE_PRICE_PRO_MONTHLY")
  return requireEnv("STRIPE_PRICE_BUSINESS_MONTHLY")
}

export function planFromPriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) return null
  const pro = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim()
  const business = process.env.STRIPE_PRICE_BUSINESS_MONTHLY?.trim()
  if (pro && priceId === pro) return "pro"
  if (business && priceId === business) return "business"
  return null
}

export function getAppBaseUrl(req?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const fromReq = req ? new URL(req.url).origin : null
  if (fromReq) return fromReq
  return "http://localhost:3000"
}
