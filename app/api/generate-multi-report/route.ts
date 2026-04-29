import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdmin, createSupabaseAnon } from "@/lib/supabase"
import type { MultiVideoAnalysis } from "@/lib/multi-video-analysis"

export const runtime = "nodejs"
export const maxDuration = 60

export type MultiReportType = "internal" | "client" | "script"

interface MultiReportRequest {
  analysis: MultiVideoAnalysis
  urls: string[]
  reportType: MultiReportType
  clientName?: string
  clientCompany?: string
  accountMemo?: string
}

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const COMMON_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif; padding: 32px; font-size: 14px; line-height: 1.8; }
  @page { size: A4; margin: 16mm; }
  h1 { font-size: 22px; font-weight: 800; }
  h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
  h3 { font-size: 13px; font-weight: 700; margin: 10px 0 4px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  p { margin-bottom: 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid currentColor; padding-bottom: 16px; margin-bottom: 24px; }
  .header-right { text-align: right; font-size: 12px; }
  .section { border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
  .item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid; page-break-inside: avoid; }
  .item p { margin: 0; }
  .badge { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .tag-list { display: flex; flex-direction: column; gap: 8px; }
  .tag-item { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; }
  .tag-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .card { border-radius: 8px; padding: 14px; page-break-inside: avoid; }
  .card-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: 4px; }
  .video-card { border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; }
  .video-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .script-box { border-radius: 6px; padding: 14px; margin: 8px 0; }
  .script-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: 6px; }
  .intro { border-left: 3px solid; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 12px; font-style: italic; }
  .qa-item { margin-bottom: 14px; page-break-inside: avoid; }
  .qa-q { font-weight: 700; margin-bottom: 4px; }
  .qa-a { padding-left: 16px; }
  @media print { button { display: none !important; } }
`

function buildInternalHtml(req: MultiReportRequest): string {
  const { analysis, urls, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })

  const videoCards = analysis.videoSummaries.map((v, i) => `
    <div class="video-card" style="background:#12161f">
      <div class="video-num" style="background:#6366f1">${i + 1}</div>
      <div>
        <p style="font-size:13px;font-weight:600;color:#e2e8f0">${esc(v.title || urls[i] || `動画${i + 1}`)}</p>
        ${v.keyFeature ? `<p style="font-size:12px;color:#94a3b8;margin:2px 0 0">${esc(v.keyFeature)}</p>` : ""}
      </div>
    </div>`).join("")

  const makeTagList = (items: string[], color: string) =>
    `<div class="tag-list">${items.map((item, i) => `
      <div class="tag-item"><div class="tag-num" style="background:${color}">${i + 1}</div><span style="color:#cbd5e1">${esc(item)}</span></div>`).join("")}</div>`

  const successItems = analysis.keySuccessFactors.map((item, i) => `
    <div class="item" style="border-color:#1e2433">
      <div class="badge" style="background:#f59e0b">${i + 1}</div>
      <p style="color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")

  const nextIdeaItems = analysis.nextVideoIdeas.map((item, i) => `
    <div class="item" style="border-color:#1e2433">
      <div class="badge" style="background:#8b5cf6">${i + 1}</div>
      <p style="color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  ${COMMON_STYLE}
  body { background: #0f1117; color: #e2e8f0; }
  .header { border-color: #6366f1; }
  .section { background: #12161f; border: 1px solid #1e2433; }
</style>
</head>
<body>
<div style="max-width:860px;margin:0 auto">

  <div class="header" style="color:#6366f1">
    <div>
      <p style="font-size:10px;letter-spacing:.2em;color:#64748b;margin-bottom:4px">MULTI VIDEO ANALYSIS — INTERNAL REPORT</p>
      <h1 style="color:#fff">複数動画 共通点分析レポート</h1>
      <p style="font-size:13px;color:#64748b;margin-top:4px">${esc(accountMemo || "")}　${urls.length}本の動画を分析</p>
    </div>
    <div class="header-right" style="color:#64748b">
      <strong style="color:#6366f1;font-size:14px;display:block">${today}</strong>
    </div>
  </div>

  <!-- 各動画サマリー -->
  <div class="section">
    <h2 style="color:#e2e8f0">分析対象動画</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px">Analyzed Videos</p>
    ${videoCards}
  </div>

  <!-- 共通パターン -->
  <div class="grid-3" style="margin-bottom:20px">
    <div class="section" style="margin-bottom:0">
      <h2 style="color:#818cf8">共通フックパターン</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:10px">Hook Patterns</p>
      ${makeTagList(analysis.commonHookPatterns, "#6366f1")}
    </div>
    <div class="section" style="margin-bottom:0">
      <h2 style="color:#fbbf24">共通感情設計</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:10px">Emotion Patterns</p>
      ${makeTagList(analysis.commonEmotionPatterns, "#f59e0b")}
    </div>
    <div class="section" style="margin-bottom:0">
      <h2 style="color:#34d399">共通CTA</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:10px">CTA Patterns</p>
      ${makeTagList(analysis.commonCTAPatterns, "#10b981")}
    </div>
  </div>

  <!-- 共通構成 -->
  ${analysis.commonStructure ? `
  <div class="section">
    <h2 style="color:#e2e8f0">共通する構成パターン</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:10px">Common Structure</p>
    <p style="color:#94a3b8;line-height:1.9">${esc(analysis.commonStructure)}</p>
  </div>` : ""}

  <!-- 成功要因 -->
  <div class="section">
    <h2 style="color:#e2e8f0">成功要因 TOP5</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:10px">Key Success Factors</p>
    ${successItems}
  </div>

  <!-- 次回作アイデア -->
  <div class="section">
    <h2 style="color:#e2e8f0">次回作アイデア</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:10px">Next Video Ideas</p>
    ${nextIdeaItems}
  </div>

</div>
</body>
</html>`
}

function buildClientHtml(req: MultiReportRequest): string {
  const { analysis, urls, clientName, clientCompany, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })

  const videoList = analysis.videoSummaries.map((v, i) =>
    `<li style="margin-bottom:6px"><strong>${esc(v.title || urls[i] || `動画${i + 1}`)}</strong>${v.keyFeature ? `<br><span style="font-size:12px;color:#64748b">${esc(v.keyFeature)}</span>` : ""}</li>`
  ).join("")

  const makePatternList = (items: string[], color: string) =>
    items.map((item, i) => `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f1f5f9;page-break-inside:avoid">
        <div style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${i + 1}</div>
        <p style="margin:0;font-size:13px;color:#374151">${esc(item)}</p>
      </div>`).join("")

  const successItems = makePatternList(analysis.keySuccessFactors, "#f59e0b")
  const nextIdeaItems = makePatternList(analysis.nextVideoIdeas, "#6366f1")

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  ${COMMON_STYLE}
  body { background: #ffffff; color: #1e293b; }
  h2 { color: #6366f1; }
  .section { background: #fff; border: 1px solid #e2e8f0; }
  @media print { button { display: none !important; } }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto">

  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:32px;margin-bottom:28px;color:#fff">
    <p style="font-size:10px;letter-spacing:.2em;opacity:.7;margin-bottom:8px">AI VIDEO ANALYSIS REPORT</p>
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin-bottom:8px">複数動画 共通点分析レポート</h1>
    ${clientCompany ? `<p style="font-size:14px;opacity:.9">${esc(clientCompany)}${clientName ? ` ${esc(clientName)} 様` : ""}</p>` : ""}
    <p style="font-size:12px;opacity:.7;margin-top:8px">${today}　作成：${esc(accountMemo || "担当者")}</p>
  </div>

  <!-- 分析対象 -->
  <div class="section" style="margin-bottom:20px;border-radius:8px;padding:20px">
    <h2 style="margin-bottom:12px">分析対象動画（${urls.length}本）</h2>
    <ul style="padding-left:20px;color:#374151;font-size:13px">${videoList}</ul>
    ${analysis.commonStructure ? `
    <div style="margin-top:16px;background:#f8faff;border-left:3px solid #6366f1;padding:12px 16px;border-radius:0 6px 6px 0">
      <p style="font-size:11px;font-weight:700;color:#6366f1;margin-bottom:4px">共通する動画の構成パターン</p>
      <p style="font-size:13px;color:#374151;line-height:1.8">${esc(analysis.commonStructure)}</p>
    </div>` : ""}
  </div>

  <!-- 共通パターン -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="section" style="border-radius:8px;padding:16px">
      <h2 style="font-size:13px;margin-bottom:10px">共通フックパターン</h2>
      ${makePatternList(analysis.commonHookPatterns, "#6366f1")}
    </div>
    <div class="section" style="border-radius:8px;padding:16px">
      <h2 style="font-size:13px;color:#f59e0b;margin-bottom:10px">共通感情設計</h2>
      ${makePatternList(analysis.commonEmotionPatterns, "#f59e0b")}
    </div>
    <div class="section" style="border-radius:8px;padding:16px">
      <h2 style="font-size:13px;color:#10b981;margin-bottom:10px">共通CTA</h2>
      ${makePatternList(analysis.commonCTAPatterns, "#10b981")}
    </div>
  </div>

  <!-- 成功要因 -->
  <div class="section" style="border-radius:8px;padding:20px;margin-bottom:20px">
    <h2 style="margin-bottom:4px">成功要因 TOP${analysis.keySuccessFactors.length}</h2>
    <p style="font-size:12px;color:#94a3b8;margin-bottom:12px">バズった動画に共通する重要ポイントです</p>
    ${successItems}
  </div>

  <!-- 次回コンテンツ案 -->
  <div class="section" style="border-radius:8px;padding:20px;margin-bottom:20px">
    <h2 style="margin-bottom:4px">次回コンテンツ案（${analysis.nextVideoIdeas.length}件）</h2>
    <p style="font-size:12px;color:#94a3b8;margin-bottom:12px">共通パターンを活かした次回作のご提案です</p>
    ${nextIdeaItems}
  </div>

  <!-- フッター -->
  <div style="text-align:center;padding:16px 0;border-top:1px solid #e2e8f0">
    <p style="font-size:11px;color:#94a3b8">本レポートはAIによる動画分析を基に作成されています</p>
  </div>

</div>
</body>
</html>`
}

function buildScriptHtml(req: MultiReportRequest): string {
  const { analysis, urls, clientName, clientCompany, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })

  const successItems = analysis.keySuccessFactors.map((item, i) => `
    <div class="item" style="border-color:#f1f5f9">
      <div class="badge" style="background:#f59e0b">${i + 1}</div>
      <p>${esc(item)}</p>
    </div>`).join("")

  const nextIdeaItems = analysis.nextVideoIdeas.map((item, i) => `
    <div class="item" style="border-color:#f1f5f9">
      <div class="badge" style="background:#10b981">${i + 1}</div>
      <p>${esc(item)}</p>
    </div>`).join("")

  const videoList = analysis.videoSummaries.map((v, i) =>
    `<li>${esc(v.title || urls[i] || `動画${i + 1}`)}${v.keyFeature ? `：${esc(v.keyFeature)}` : ""}</li>`
  ).join("")

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  ${COMMON_STYLE}
  body { background: #f8f9fa; color: #1e293b; }
  .header { border-color: #4f46e5; }
  .section { background: #fff; border: 1px solid #e2e8f0; }
  h2 { color: #4f46e5; }
  .intro { border-color: #4f46e5; background: #f1f5f9; color: #475569; }
  .script-box { background: #fafafa; border: 1px dashed #cbd5e1; }
  .script-label { color: #4f46e5; }
  .qa-q { color: #4f46e5; }
  .qa-a { color: #475569; }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto">

  <div class="header" style="color:#4f46e5">
    <div>
      <p style="font-size:10px;letter-spacing:.2em;color:#94a3b8;margin-bottom:4px">PRESENTATION SCRIPT — MULTI VIDEO</p>
      <h1>複数動画 共通点分析 プレゼン台本</h1>
      ${clientCompany ? `<p style="font-size:13px;color:#475569;margin-top:4px">${esc(clientCompany)}${clientName ? ` ${esc(clientName)} 様` : ""}</p>` : ""}
    </div>
    <div class="header-right" style="color:#64748b">
      <strong style="display:block;font-size:14px;color:#1e293b">${today}</strong>
      ${esc(accountMemo || "担当者")}
    </div>
  </div>

  <!-- 概要 -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px">
    <p style="font-size:11px;color:#64748b;margin-bottom:8px">分析対象（${urls.length}本）</p>
    <ul style="font-size:13px;color:#475569">${videoList}</ul>
  </div>

  <div class="section">
    <h2>① 挨拶・はじめに</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約1分</p>
    <div class="script-box">
      <div class="script-label">★ 開始トーク</div>
      <p>本日はお時間をいただきありがとうございます。今回は${urls.length}本の動画を横断的に分析し、共通する成功パターンを抽出しました。この分析を活かすことで、再現性の高いコンテンツ制作が可能になります。それではご説明させていただきます。</p>
    </div>
  </div>

  <div class="section">
    <h2>② 共通パターンの概要</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約2分</p>
    <div class="intro">今回分析した${urls.length}本の動画には、明確な共通パターンが見られました。</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="card" style="background:#f8faff;border-left:3px solid #4f46e5">
        <div class="card-label" style="color:#4f46e5">共通フック</div>
        <ul style="font-size:12px;color:#475569;padding-left:16px">${analysis.commonHookPatterns.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>
      <div class="card" style="background:#fffbf0;border-left:3px solid #f59e0b">
        <div class="card-label" style="color:#f59e0b">共通感情設計</div>
        <ul style="font-size:12px;color:#475569;padding-left:16px">${analysis.commonEmotionPatterns.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>
      <div class="card" style="background:#f0fdf4;border-left:3px solid #10b981">
        <div class="card-label" style="color:#10b981">共通CTA</div>
        <ul style="font-size:12px;color:#475569;padding-left:16px">${analysis.commonCTAPatterns.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>
    </div>
    <div class="script-box">
      <div class="script-label">★ 概要トーク</div>
      <p>特に注目すべきは共通のフック手法です。「${esc(analysis.commonHookPatterns[0] ?? "")}」という形で視聴者の興味を引く手法が全動画で確認できました。</p>
    </div>
  </div>

  ${analysis.commonStructure ? `
  <div class="section">
    <h2>③ 共通する構成パターン</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約2分</p>
    <div class="intro">${esc(analysis.commonStructure)}</div>
    <div class="script-box">
      <div class="script-label">★ 構成説明トーク</div>
      <p>この構成パターンは視聴者が離脱しにくい順序になっており、再現することで安定した視聴維持が期待できます。</p>
    </div>
  </div>` : ""}

  <div class="section">
    <h2>④ 成功要因 TOP${analysis.keySuccessFactors.length}</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約3分</p>
    <div class="intro">バズった動画に共通する成功要因を重要度順にまとめました。</div>
    ${successItems}
  </div>

  <div class="section">
    <h2>⑤ 次回コンテンツ案（${analysis.nextVideoIdeas.length}件）</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約2分</p>
    <div class="intro">これらの共通パターンを活かした次回コンテンツのアイデアをご提案します。</div>
    ${nextIdeaItems}
  </div>

  <div class="section">
    <h2>⑥ まとめ・質疑応答</h2>
    <p style="font-size:11px;color:#94a3b8;margin-bottom:12px">約2分</p>
    <div class="script-box">
      <div class="script-label">★ まとめトーク</div>
      <p>以上が${urls.length}本の動画から抽出した共通成功パターンのご説明です。特に成功要因の①〜③を次回作に意識的に取り入れることで、バズりやすい動画を再現できます。ご不明点がございましたら何でもご質問ください。</p>
    </div>
    <h3>想定Q&A</h3>
    <div class="qa-item">
      <div class="qa-q">Q. どの動画が最も参考になりますか？</div>
      <div class="qa-a">A. 成功要因をより多く満たしている動画が最も参考になります。分析結果の各動画サマリーをご確認ください。</div>
    </div>
    <div class="qa-item">
      <div class="qa-q">Q. このパターンをすぐに実践できますか？</div>
      <div class="qa-a">A. はい。特にフックと感情設計は次回作から即座に取り入れていただけます。</div>
    </div>
    <div class="qa-item">
      <div class="qa-q">Q. 次回作アイデアの優先順位は？</div>
      <div class="qa-a">A. チャンネルの現在のテーマや視聴者層に最も近いアイデアから着手するのが効果的です。</div>
    </div>
  </div>

</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!accessToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const supabase = createSupabaseAnon()
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const { data: userData } = await admin
    .from("users")
    .select("plan")
    .eq("id", authData.user.id)
    .single()

  if (userData?.plan !== "business") {
    return NextResponse.json({ error: "BUSINESS_PLAN_REQUIRED" }, { status: 403 })
  }

  let body: MultiReportRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { analysis, urls, reportType, clientName, clientCompany, accountMemo } = body
  if (!analysis || !urls || !reportType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const html = reportType === "internal"
    ? buildInternalHtml({ analysis, urls, reportType, clientName, clientCompany, accountMemo })
    : reportType === "client"
    ? buildClientHtml({ analysis, urls, reportType, clientName, clientCompany, accountMemo })
    : buildScriptHtml({ analysis, urls, reportType, clientName, clientCompany, accountMemo })

  const printBtn = `<div style="position:fixed;top:16px;right:16px;z-index:9999;display:flex;gap:8px">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨 PDFで保存</button>
    <button onclick="window.close()" style="background:#374151;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer">✕</button>
  </div><style>@media print{button{display:none!important}}</style>`
  const finalHtml = html.replace(/<body[^>]*>/i, (m) => `${m}${printBtn}`)

  return new NextResponse(finalHtml, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Report-Type": "html" },
  })
}
