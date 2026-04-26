import { NextRequest, NextResponse } from "next/server"
  import { z } from "zod"
  import { structureTimelineFieldKeys } from "@/lib/structure-timeline"
  import { detectPlatform } from "@/lib/platforms/types"
  import { youtubePlatform } from "@/lib/platforms/youtube"
  import { tiktokPlatform } from "@/lib/platforms/tiktok"
  import { instagramPlatform } from "@/lib/platforms/instagram"
  import {
    formatSheetImprovementLines,
    formatSheetImprovementTags,
    formatSheetThumbnailImprovements,
  } from "@/lib/reference-insights"
  import {
    assertSupabaseForAnalyze,
    checkAnalysisLimit,
    fetchUserUsageRow,
    incrementUserAnalysisCounts,
    isAnalysisLimitDisabled,
    type UserUsageRow,
  } from "@/lib/analysis-usage"
  import { fetchOpenAIChatCompletions } from "@/lib/openai-chat"
  import {
    buildUnifiedAnalysisSystemPrompt,
    parseUnifiedOpenAiAnalysisContent,
  } from "@/lib/unified-analysis-openai"
  import { createSupabaseAdmin, createSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase"
  import type { User, SupabaseClient } from "@supabase/supabase-js"

  const GUEST_ANALYSIS_COOKIE = "aiai_guest_analysis_count"

  function readGuestAnalysisCount(req: NextRequest): number {
    const raw = req.cookies.get(GUEST_ANALYSIS_COOKIE)?.value
    if (raw == null || raw === "") return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  const platformAdapters = [youtubePlatform, tiktokPlatform, instagramPlatform]

  function getPlatformAdapter(url: string) {
    return platformAdapters.find((a) => a.detect(url)) ?? null
  }

  function detectVideoType(url: string): "shorts" | "long" {
    const u = url.toLowerCase()
    if (u.includes("tiktok.com") || u.includes("instagram.com")) return "shorts"
    return u.includes("/shorts/") ? "shorts" : "long"
  }

  function getPlatformSheetLabel(url: string): string {
    const u = url.toLowerCase()
    if (u.includes("tiktok.com")) return "TikTok"
    if (u.includes("instagram.com")) return "Instagram Reels"
    if (u.includes("/shorts/") || u.includes("youtu.be")) return "YouTube ショート"
    return "YouTube 通常動画"
  }

  function mergeCookiesFromResponse(cookieJar: string, res: Response): string {
    const h = res.headers as Headers & { getSetCookie?: () => string[] }
    const list = typeof h.getSetCookie === "function" ? h.getSetCookie() : []
    if (list.length === 0) return cookieJar

    const map = new Map<string, string>()
    for (const part of cookieJar.split(";").map((s) => s.trim()).filter(Boolean)) {
      const eq = part.indexOf("=")
      if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1))
    }
    for (const line of list) {
      const nv = line.split(";")[0]?.trim()
      if (!nv || !nv.includes("=")) continue
      const eq = nv.indexOf("=")
      map.set(nv.slice(0, eq), nv.slice(eq + 1))
    }
    return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
  }

  async function postToGoogleAppsScriptWebhook(
    execUrl: string,
    jsonBody: string,
    signal: AbortSignal
  ): Promise<Response> {
    const attempts: Array<{ label: string; headers: Record<string, string>; body: string }> = [
      {
        label: "json",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: jsonBody,
      },
      {
        label: "textPlain",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: jsonBody,
      },
      {
        label: "formData",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: new URLSearchParams({ data: jsonBody }).toString(),
      },
    ]

    const browserHeaders = {
      Accept: "*/*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://script.google.com/",
    }

    try {
      const fr = await fetch(execUrl, {
        method: "POST",
        headers: { ...browserHeaders, "Content-Type": "application/json; charset=utf-8" },
        body: jsonBody,
        redirect: "follow",
        signal,
      })
      const txt = await fr.text()
      const bad = txt.includes("ページが見つかりません") || txt.includes("Script function not found")
      const finalUrl = typeof (fr as { url?: string }).url === "string" ? (fr as { url: string }).url : ""
      console.log("[GAS webhook] redirect:follow", fr.status, finalUrl.slice(0, 120), txt.slice(0, 80))
      if (fr.ok && !bad) {
        return new Response(txt, { status: fr.status, headers: fr.headers })
      }
    } catch (e) {
      console.error("[GAS webhook] redirect:follow error", e)
    }

    let last: Response | null = null

    for (const attempt of attempts) {
      let currentUrl = execUrl
      let cookieJar = ""
      for (let hop = 0; hop < 8; hop++) {
        const reqHeaders: Record<string, string> = { ...browserHeaders, ...attempt.headers }
        if (cookieJar) reqHeaders.Cookie = cookieJar

        const res = await fetch(currentUrl, {
          method: "POST",
          headers: reqHeaders,
          body: attempt.body,
          signal,
          redirect: "manual",
        })
        last = res
        cookieJar = mergeCookiesFromResponse(cookieJar, res)

        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location")
          if (!loc) {
            console.error("GAS webhook redirect without Location", attempt.label, hop, res.status)
            break
          }
          const nextUrl = new URL(loc, currentUrl).href
          console.log("[GAS webhook] redirect", attempt.label, hop, res.status, "->", nextUrl.slice(0, 140))
          currentUrl = nextUrl
          continue
        }

        if (res.ok) {
          return res
        }

        const peek = await res.clone().text()
        console.error("GAS webhook attempt failed", attempt.label, hop, res.status, peek.slice(0, 200))
        break
      }
    }

    return last ?? new Response("GAS webhook: no response", { status: 599 })
  }

  const bodySchema = z.object({
    url: z.string().min(1),
    title: z.string(),
    channelName: z.string(),
    publishedAt: z.string().nullable().optional(),
    viewCount: z.number().nullable().optional(),
    duration: z.number().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
    /** バズ分析: research または従来の buzz。バズりたい: growth */
    mode: z
      .enum(["research", "growth", "buzz"])
      .optional()
      .transform((m): "research" | "growth" => {
        if (m === undefined) return "growth"
        return m === "buzz" ? "research" : m
      }),
    competitorUrl: z.string().nullish(),
    /** Chrome拡張から送られる数値データ（TikTok・Instagram用） */
    extensionData: z
      .object({
        views: z.number().nullable().optional(),
        likes: z.number().nullable().optional(),
        comments: z.number().nullable().optional(),
        captions: z.string().optional().default(""),
        hashtags: z.string().optional().default(""),
        bgm: z.string().optional().default(""),
        thumbnailUrl: z.string().optional().default(""),
      })
      .optional(),
  })

  export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません。.env.local に設定してください。" },
        { status: 500 }
      )
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { url, title, channelName, publishedAt, viewCount, duration, thumbnailUrl, mode, competitorUrl, extensionData } =
      parsed.data

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json(
        { error: "YouTube・TikTok・Instagram のURLではない可能性があります" },
        { status: 400 }
      )
    }
    const adapter = getPlatformAdapter(url)!

    const authHeader = req.headers.get("authorization")
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

    let authUser: User | null = null
    if (accessToken && isSupabaseConfigured()) {
      try {
        const anon = createSupabaseAnon()
        const { data, error } = await anon.auth.getUser(accessToken)
        if (!error && data.user) authUser = data.user
      } catch (e) {
        console.warn("[analyze] auth.getUser failed, treating as guest:", e)
      }
    }

    let admin: SupabaseClient | null = null
    const isGuest = authUser == null
    const limitDisabled = isAnalysisLimitDisabled()

    if (!isGuest && authUser) {
      const supabaseGate = assertSupabaseForAnalyze()
      if (!supabaseGate.ok) {
        return NextResponse.json(supabaseGate.body, { status: supabaseGate.status })
      }
      admin = createSupabaseAdmin()
      const usageProfile = await fetchUserUsageRow(admin, authUser.id, authUser.email ?? null)
      if (!usageProfile) {
        return NextResponse.json({ error: "USER_PROFILE_UNAVAILABLE" }, { status: 500 })
      }
      if (!limitDisabled) {
        const limit = checkAnalysisLimit(usageProfile)
        if (!limit.ok) {
          return NextResponse.json({ error: "LIMIT_EXCEEDED", plan: limit.plan }, { status: 403 })
        }
      }
    } else {
      if (!limitDisabled && readGuestAnalysisCount(req) >= 1) {
        return NextResponse.json({ error: "LIMIT_EXCEEDED", plan: "free" }, { status: 403 })
      }
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

    const competitorUrlTrimmed = typeof competitorUrl === "string" ? competitorUrl.trim() : ""
    const hasCompetitorUrl = competitorUrlTrimmed.length > 0

    // ★ 字幕を先に取得してメイン分析にも使う
    // YouTube: APIで取得 / TikTok・Instagram: Chrome拡張のcaptionsを使用
    let transcript = ""
    if (platform === "youtube") {
      transcript = await adapter.fetchTranscript(url, { durationHintSec: duration ?? null })
    } else if (extensionData?.captions) {
      transcript = extensionData.captions
    }

    let competitorTranscript = ""
    if (hasCompetitorUrl && detectPlatform(competitorUrlTrimmed) === "youtube") {
      const competitorAdapter = youtubePlatform
      competitorTranscript = await competitorAdapter.fetchTranscript(competitorUrlTrimmed, { durationHintSec: null })
    }

    const competitorBlock = hasCompetitorUrl
      ? `\n--- 競合動画（比較対象） ---\n動画URL: ${competitorUrlTrimmed}\n${
          !detectPlatform(competitorUrlTrimmed)
            ? "※対応プラットフォームのURLとして解釈できません。字幕は取得していません。\n"
            : ""
        }${
          competitorTranscript
            ? `--- 競合の字幕（秒付き） ---\n${competitorTranscript.slice(0, 7000)}`
            : "（競合動画の字幕は取得できませんでした）"
        }\n`
      : ""

    // For TikTok/Instagram: use extensionData.thumbnailUrl if no YouTube thumbnail
    const effectiveThumbnailUrl = thumbnailUrl || extensionData?.thumbnailUrl || null

    let thumbForOpenAi: string | undefined
    if (effectiveThumbnailUrl != null) {
      const t = String(effectiveThumbnailUrl).trim()
      if (t) {
        try {
          const u = new URL(t)
          if (u.protocol === "http:" || u.protocol === "https:") thumbForOpenAi = u.toString()
        } catch {
          thumbForOpenAi = undefined
        }
      }
    }

    const isVisualContent = (platform === "tiktok" || platform === "instagram") && !transcript
    const bgm = extensionData?.bgm || ""
    const hashtags = extensionData?.hashtags || ""

    const systemPrompt = buildUnifiedAnalysisSystemPrompt(
      mode, hasCompetitorUrl, Boolean(thumbForOpenAi), isVisualContent
    )

    const visualMetaBlock = isVisualContent
      ? `\n--- ビジュアル系コンテンツ情報 ---\nBGM・使用音源: ${bgm || "不明"}\nハッシュタグ: ${hashtags || "なし"}\nプラットフォーム: ${getPlatformSheetLabel(url)}\n`
      : ""

    const hasTranscript = Boolean(transcript)
    const userContent = `動画の長さ(秒・参考): ${duration != null ? String(duration) : "不明"}
動画URL: ${url}
動画タイトル: ${title}
チャンネル名: ${channelName}
${visualMetaBlock}${hasTranscript ? `\n--- 字幕（秒付き） ---\n${transcript.slice(0, 11000)}` : "（字幕・音声なし：ビジュアル系コンテンツとして分析）"}
${competitorBlock}
【厳守】analysis.improvementIdeas の5件は以下のルールに従うこと：
${hasTranscript
  ? "- 必ず字幕の具体的な発言・秒数を「〇〇秒の『△△』という発言の後に〜」の形式で引用すること"
  : "- 字幕がないため、タイトル・BGM・ハッシュタグ・サムネイル・再生数/いいね数などのメタデータに基づいた具体的な改善案を書くこと"}
- 「フックを強化する」「テンポを上げる」「CTAを明確にする」「視聴者参加型」などの汎用表現だけで終わらせることを禁止する
- この動画にしか当てはまらない改善案を書くこと
上記をもとに、システム指示のとおり analysis / structureTimeline / referenceInsights を含む1つのJSONのみを返してください。`

    const userMessage: {
      role: "user"
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "low" } }
          >
    } = thumbForOpenAi
      ? {
          role: "user",
          content: [
            { type: "text", text: userContent },
            { type: "image_url", image_url: { url: thumbForOpenAi, detail: "low" } },
          ],
        }
      : { role: "user", content: userContent }

    let res: Response
    try {
      res = await fetchOpenAIChatCompletions(
        apiKey,
        {
          model,
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: systemPrompt }, userMessage],
        },
        { maxRetries: 6 }
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : "OpenAI への接続に失敗しました"
      return NextResponse.json({ error: message }, { status: 502 })
    }

    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) {
        let apiDetail = ""
        try {
          const j = JSON.parse(errText) as { error?: { message?: string } }
          const m = j?.error?.message?.trim()
          if (m) apiDetail = `（OpenAI: ${m.slice(0, 200)}）`
        } catch {
          /* ignore */
        }
        return NextResponse.json(
          {
            error: "OPENAI_RATE_LIMIT",
            message:
              `OpenAI の一時的な上限（レート制限）に達しました（429）。2〜5分ほど空けてから再度お試しください。繰り返す場合は https://platform.openai.com/account/billing でクレジットと利用枠を確認するか、.env.local の OPENAI_MODEL を gpt-4o-mini にすると改善することがあります。${apiDetail}`,
          },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `OpenAI API エラー: ${res.status}`, detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const completion = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "AIからの応答が空でした" }, { status: 502 })
    }

    const parsedUnified = parseUnifiedOpenAiAnalysisContent(content, {
      durationSec: duration ?? null,
      sourceThumbnailUrl: thumbForOpenAi,
    })
    if (!parsedUnified.ok) {
      return NextResponse.json(
        { error: "AIの出力形式が不正です", detail: parsedUnified.error },
        { status: 502 }
      )
    }

    function convertSecondsToMinSec(text: string): string {
      return text.replace(/(\d+(?:\.\d+)?)秒/g, (_, numStr: string) => {
        const totalSec = parseFloat(numStr)
        const minutes = Math.floor(totalSec / 60)
        const seconds = Math.round(totalSec % 60)
        return `${minutes}分${seconds}秒`
      })
    }

    const analysis = {
      ...parsedUnified.value.analysis,
      improvementIdeas: parsedUnified.value.analysis.improvementIdeas.map(convertSecondsToMinSec),
    }
    const timelineForSheet = parsedUnified.value.timelineForSheet
    const referenceInsights = parsedUnified.value.referenceInsights

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim()
    if (webhookUrl) {
      try {
        const u = new URL(webhookUrl)
        console.log("[GAS webhook] 送信先 pathname:", u.pathname)
      } catch {
        console.error("[GAS] GOOGLE_SHEETS_WEBHOOK_URL が有効な URL ではありません")
      }
      const analyzedAt = new Date().toISOString()
      const durationSec = duration ?? null
      const videoType = detectVideoType(url)
      const sheetColE_shorts = videoType === "shorts" ? "ショート動画" : ""
      const sheetColF_regular = videoType === "long" ? "通常動画" : ""

      const sheetThumbnailScore =
        referenceInsights.sourceThumbnail != null ? referenceInsights.sourceThumbnail.thumbnailScore : null
      const sheetThumbnailImprovements = formatSheetThumbnailImprovements(referenceInsights.sourceThumbnail)

      const ideas = analysis.improvementIdeas
      const nextIdeas = analysis.nextVideoIdeas

      const payload = {
        analyzedAt,
        platform: getPlatformSheetLabel(url),
        videoType,
        sheetColE_shorts,
        sheetColF_regular,
        url,
        title,
        channelName,
        publishedAt: publishedAt ?? null,
        viewCount: viewCount ?? null,
        duration: durationSec,
        durationSec,
        thumbnailUrl: thumbnailUrl ?? null,
        hookType: analysis.hook.value,
        emotionType: analysis.emotion.value,
        ctaType: analysis.cta.value,
        structureType: analysis.structure.value,
        subjectType: analysis.subjectType,
        actionType: analysis.actionType,
        sceneChangeLevel: analysis.sceneChangeLevel,
        endingType: analysis.endingType,
        retentionPrediction: analysis.retention.value,
        retentionScore: analysis.retentionScore,
        retentionLabel: analysis.retentionLabel,
        retentionReasons: analysis.retentionReasons,
        improvementIdea1: ideas[0] ?? "",
        improvementIdea2: ideas[1] ?? "",
        improvementIdea3: ideas[2] ?? "",
        nextVideoIdea1: nextIdeas[0] ?? "",
        nextVideoIdea2: nextIdeas[1] ?? "",
        nextVideoIdea3: nextIdeas[2] ?? "",
        sheetImprovementTags: formatSheetImprovementTags(referenceInsights.enrichedImprovements),
        sheetImprovementLines: formatSheetImprovementLines(referenceInsights.enrichedImprovements),
        ...timelineForSheet,
        sheetThumbnailScore,
        sheetThumbnailImprovements,
      }

      const timelinePayloadSlice = Object.fromEntries(
        structureTimelineFieldKeys.map((k) => [k, (payload as Record<string, unknown>)[k]])
      ) as Record<(typeof structureTimelineFieldKeys)[number], unknown>
      const hasAnyTimelineSec = structureTimelineFieldKeys
        .filter((k) => k.endsWith("Sec"))
        .some((k) => {
          const v = timelinePayloadSlice[k]
          return typeof v === "string" && v.trim().length > 0
        })
      console.log("[GAS webhook] timeline fields in payload (hookStartSec 等):", timelinePayloadSlice)
      console.log("[GAS webhook] timeline numeric fields non-empty?:", hasAnyTimelineSec)

      const jsonBody = JSON.stringify(payload)
      const maxLogChars = 16_000
      if (jsonBody.length <= maxLogChars) {
        console.log("[GAS webhook] full payload JSON:", jsonBody)
      } else {
        console.log("[GAS webhook] full payload JSON (truncated, length=" + jsonBody.length + "):", jsonBody.slice(0, maxLogChars) + "…")
      }

      const ac = new AbortController()
      const timeoutId = setTimeout(() => ac.abort(), 20000)
      try {
        const webhookRes = await postToGoogleAppsScriptWebhook(webhookUrl, jsonBody, ac.signal)
        const bodyText = await webhookRes.text()
        if (!webhookRes.ok) {
          console.error("GAS webhook non-2xx", webhookRes.status, bodyText.slice(0, 400))
        } else {
          console.log("GAS webhook", webhookRes.status, bodyText.slice(0, 200))
        }
      } catch (e) {
        console.error("GAS webhook POST failed", e)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    type UsagePayload = Pick<UserUsageRow, "plan" | "analysis_count_total" | "analysis_count_month" | "usage_month">
    const responseBody: {
      analysis: typeof analysis
      referenceInsights: typeof referenceInsights
      usage?: UsagePayload
    } = { analysis, referenceInsights }

    if (!isGuest && admin && authUser != null) {
      try {
        await incrementUserAnalysisCounts(admin, authUser.id)
      } catch (e) {
        console.error("[analyze] incrementUserAnalysisCounts failed", e)
      }
      const { data: usageRow, error: usageErr } = await admin
        .from("users")
        .select("plan, analysis_count_total, analysis_count_month, usage_month")
        .eq("id", authUser.id)
        .maybeSingle()
      if (usageErr) {
        console.error("[analyze] fetch usage after increment failed", usageErr)
      } else if (usageRow) {
        responseBody.usage = usageRow as UsagePayload
      }
    }

    const jsonResponse = NextResponse.json(responseBody)
    if (isGuest && !limitDisabled) {
      jsonResponse.cookies.set(GUEST_ANALYSIS_COOKIE, "1", {
        maxAge: 60 * 60 * 24 * 400,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      })
    }

    return jsonResponse
  }
