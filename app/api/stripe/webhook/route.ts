import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createSupabaseAdmin } from "@/lib/supabase"
import { getStripe, getStripeWebhookSecret, planFromPriceId, billingPlanFromPriceId } from "@/lib/stripe"

export const runtime = "nodejs"

async function updateUserPlan(userId: string, plan: "free" | "pro" | "business") {
  const admin = createSupabaseAdmin()
  const { error } = await admin.from("users").update({ plan }).eq("id", userId)
  if (error) {
    console.error("[stripe/webhook] update users.plan failed", userId, plan, error)
  }
}

async function upsertAutovidSubscription(params: {
  userId: string
  subscriptionId: string
  priceId: string
  status: string
  currentPeriodEnd: number | null
}) {
  const admin = createSupabaseAdmin()
  const billingPlan = billingPlanFromPriceId(params.priceId) ?? params.priceId
  const payload = {
    stripe_subscription_id: params.subscriptionId,
    price_id: params.priceId,
    plan_name: billingPlan,
    status: params.status,
    current_period_end: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }

  // Try update first, then insert if no row exists
  const { data: existing } = await admin
    .from("autovid_subscriptions")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from("autovid_subscriptions")
      .update(payload)
      .eq("user_id", params.userId)
    if (error) console.error("[stripe/webhook] update autovid_subscriptions failed", params.userId, error)
  } else {
    const { error } = await admin
      .from("autovid_subscriptions")
      .insert({ user_id: params.userId, ...payload })
    if (error) console.error("[stripe/webhook] insert autovid_subscriptions failed", params.userId, error)
  }
}

async function deleteAutovidSubscription(userId: string) {
  const admin = createSupabaseAdmin()
  const { error } = await admin
    .from("autovid_subscriptions")
    .delete()
    .eq("user_id", userId)
  if (error) {
    console.error("[stripe/webhook] delete autovid_subscriptions failed", userId, error)
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
    return (customer as Stripe.Customer).metadata?.user_id?.trim() || null
  } catch (e) {
    console.error("[stripe/webhook] retrieve customer failed", e)
    return null
  }
}

function getPriceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null
}

function planFromSubscriptionItems(subscription: Stripe.Subscription): "pro" | "business" | null {
  const priceId = getPriceIdFromSubscription(subscription)
  return planFromPriceId(priceId)
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id?.trim() || session.client_reference_id?.trim()
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = getPriceIdFromSubscription(subscription)
          const internalPlan = planFromPriceId(priceId)
          if (priceId) {
            await upsertAutovidSubscription({
              userId,
              subscriptionId,
              priceId,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end ?? null,
            })
          }
          if (internalPlan) {
            await updateUserPlan(userId, internalPlan)
          }
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await extractUserIdFromSubscription(stripe, subscription)
        if (userId) {
          const priceId = getPriceIdFromSubscription(subscription)
          const isActive = subscription.status === "active" || subscription.status === "trialing"
          if (priceId) {
            await upsertAutovidSubscription({
              userId,
              subscriptionId: subscription.id,
              priceId,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end ?? null,
            })
          }
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
          typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription as Stripe.Subscription)?.id
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = await extractUserIdFromSubscription(stripe, subscription)
          if (userId) {
            const priceId = getPriceIdFromSubscription(subscription)
            if (priceId) {
              await upsertAutovidSubscription({
                userId,
                subscriptionId: subscription.id,
                priceId,
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end ?? null,
              })
            }
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
          await deleteAutovidSubscription(userId)
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
