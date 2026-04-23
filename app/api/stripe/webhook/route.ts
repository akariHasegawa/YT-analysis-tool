import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createSupabaseAdmin } from "@/lib/supabase"
import { getStripe, getStripeWebhookSecret, planFromPriceId } from "@/lib/stripe"

export const runtime = "nodejs"

async function updateUserPlan(userId: string, plan: "free" | "pro" | "business") {
  const admin = createSupabaseAdmin()
  const { error } = await admin.from("users").update({ plan }).eq("id", userId)
  if (error) {
    console.error("[stripe/webhook] update users.plan failed", userId, plan, error)
    throw new Error(`DB update failed: ${error.message}`)
  }
}

async function extractUserIdFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  const direct = subscription.metadata?.user_id?.trim()
  if (direct) return direct

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
  if (!customerId) return null

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    return customer.metadata?.user_id?.trim() || null
  } catch (e) {
    console.error("[stripe/webhook] retrieve customer failed", e)
    return null
  }
}

function planFromSubscriptionItems(subscription: Stripe.Subscription): "pro" | "business" | null {
  const items = subscription.items?.data ?? []
  for (const item of items) {
    const p = planFromPriceId(item.price?.id)
    if (p) return p
  }
  return null
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = getStripeWebhookSecret()

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid webhook signature"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await extractUserIdFromSubscription(stripe, subscription)
        if (userId) {
          const isActive = subscription.status === "active" || subscription.status === "trialing"
          if (isActive) {
            const plan = planFromSubscriptionItems(subscription)
            if (plan) await updateUserPlan(userId, plan)
          } else if (["past_due", "unpaid", "canceled"].includes(subscription.status)) {
            await updateUserPlan(userId, "free")
          }
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = await extractUserIdFromSubscription(stripe, subscription)
          if (userId) {
            const plan = planFromSubscriptionItems(subscription)
            if (plan) await updateUserPlan(userId, plan)
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await extractUserIdFromSubscription(stripe, subscription)
        if (userId) {
          await updateUserPlan(userId, "free")
        }
        break
      }

      default:
        break
    }
  } catch (e) {
    console.error("[stripe/webhook] handler failed", event.type, e)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
