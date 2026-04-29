import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createSupabaseAdmin, createSupabaseAnon } from "@/lib/supabase"
import type { ShortsAnalysis } from "@/lib/shorts-analysis"
import type { VideoInfo } from "@/lib/video-info"

export const runtime = "nodejs"
export const maxDuration = 300

export type ReportType = "internal" | "client" | "script"

interface ReportRequest {
  analysis: ShortsAnalysis
  videoInfo: VideoInfo
  reportType: ReportType
  clientName?: string
  clientCompany?: string
  accountMemo?: string
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function buildInternalReportHtml(req: ReportRequest): string {
  const { analysis, videoInfo, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  const score = analysis.retentionScore ?? 0
  const reasons = analysis.retentionReasons ?? []
  const improvements = analysis.improvementIdeas ?? []
  const nextIdeas = analysis.nextVideoIdeas ?? []

  const reasonItems = reasons.map(r => `<li style="margin-bottom:6px">${esc(r)}</li>`).join("")
  const improvementItems = improvements.map((item, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #1e2433">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${i + 1}</span>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")
  const nextIdeaItems = nextIdeas.map((item, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #1e2433">
      <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${i + 1}</span>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#cbd5e1">${esc(item)}</p>
    </div>`).join("")

  const cc = analysis.competitorComparison
  const competitorBlock = cc ? `
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <h2 style="margin:0 0 16px;font-size:14px;font-weight:700;color:#f59e0b;letter-spacing:.05em">競合比較</h2>
      ${[
        { label: "競合の強み", items: cc.competitorStrengths },
        { label: "自社の弱み", items: cc.yourWeaknesses },
        { label: "優先改善点", items: cc.priorityImprovements },
      ].map(({ label, items }) => `
        <p style="font-size:11px;color:#64748b;margin:12px 0 4px">${label}</p>
        <ul style="padding-left:16px;color:#cbd5e1;font-size:13px;line-height:1.8">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
      `).join("")}
    </div>` : ""

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; color: #e2e8f0; font-family: "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif; padding: 32px; }
  @page { size: A4; margin: 0; }
</style></head>
<body>
  <div style="max-width:860px;margin:0 auto">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1e2433">
      <div>
        <p style="font-size:10px;letter-spacing:.2em;color:#64748b;margin-bottom:6px">INTERNAL ANALYSIS REPORT</p>
        <h1 style="font-size:26px;font-weight:800;color:#fff">動画分析レポート</h1>
      </div>
      <div style="text-align:right">
        <p style="font-size:12px;color:#64748b">作成日</p>
        <p style="font-size:16px;font-weight:700;color:#6366f1">${today}</p>
        <p style="font-size:11px;color:#475569;margin-top:4px">${esc(videoInfo.url ?? "")}</p>
      </div>
    </div>

    <!-- Video Info -->
    <div style="background:#12161f;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <p style="font-size:10px;color:#64748b;margin-bottom:4px">タイトル</p>
        <p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(videoInfo.title)}</p>
      </div>
      <div>
        <p style="font-size:10px;color:#64748b;margin-bottom:4px">チャンネル / アカウント</p>
        <p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(accountMemo || videoInfo.channelName)}</p>
      </div>
      ${videoInfo.views ? `<div><p style="font-size:10px;color:#64748b;margin-bottom:4px">再生数</p><p style="font-size:14px;font-weight:600;color:#e2e8f0">${videoInfo.views.toLocaleString("ja-JP")}</p></div>` : ""}
      ${videoInfo.publishedAt ? `<div><p style="font-size:10px;color:#64748b;margin-bottom:4px">公開日</p><p style="font-size:14px;font-weight:600;color:#e2e8f0">${esc(videoInfo.publishedAt)}</p></div>` : ""}
    </div>

    <!-- Score -->
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
        <div style="text-align:center">
          <p style="font-size:52px;font-weight:800;color:#6366f1;line-height:1">${score}</p>
          <p style="font-size:11px;color:#64748b">/ 100</p>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <p style="font-size:13px;font-weight:600;color:#e2e8f0">視聴維持率スコア</p>
            <span style="background:#6366f1;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px">${esc(analysis.retentionLabel ?? "")}</span>
          </div>
          <div style="background:#1e2433;border-radius:4px;height:10px;overflow:hidden">
            <div style="width:${score}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6)"></div>
          </div>
          ${reasonItems ? `<ul style="margin-top:12px;padding-left:16px;color:#94a3b8;font-size:12px;line-height:1.8">${reasonItems}</ul>` : ""}
        </div>
      </div>
    </div>

    <!-- HOOK / EMOTION / CTA / STRUCTURE -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      ${[
        { label: "HOOK", color: "#6366f1", block: analysis.hook },
        { label: "EMOTION", color: "#f59e0b", block: analysis.emotion },
        { label: "CTA", color: "#10b981", block: analysis.cta },
        { label: "STRUCTURE", color: "#8b5cf6", block: analysis.structure },
      ].map(({ label, color, block }) => `
        <div style="background:#12161f;border-left:3px solid ${color};border-radius:0 12px 12px 0;padding:16px">
          <p style="font-size:10px;letter-spacing:.1em;color:${color};font-weight:700;margin-bottom:4px">${label}</p>
          <p style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px">${esc(block.value)}</p>
          <p style="font-size:12px;line-height:1.7;color:#94a3b8">${esc(block.description)}</p>
        </div>`).join("")}
    </div>

    ${competitorBlock}

    <!-- Improvement Ideas -->
    ${improvements.length ? `
    <div style="background:#12161f;border-radius:12px;padding:24px;margin-bottom:24px">
      <h2 style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">改善アイデア</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">Improvement Ideas</p>
      ${improvementItems}
    </div>` : ""}

    <!-- Next Video Ideas -->
    ${nextIdeas.length ? `
    <div style="background:#12161f;border-radius:12px;padding:24px">
      <h2 style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">次の動画アイデア</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">Next Video Ideas</p>
      ${nextIdeaItems}
    </div>` : ""}
  </div>
</body>
</html>`
}

function buildScriptReportHtml(req: ReportRequest): string {
  const { analysis, videoInfo, clientName, clientCompany, accountMemo } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  const score = analysis.retentionScore ?? 0
  const improvements = analysis.improvementIdeas ?? []
  const nextIdeas = analysis.nextVideoIdeas ?? []
  const cc = analysis.competitorComparison

  const scoreLabel = score >= 80 ? "非常に高い" : score >= 60 ? "高い" : score >= 40 ? "普通" : "要改善"

  const improvementItems = improvements.map((item, i) => `
    <div class="item">
      <span class="badge purple">${i + 1}</span>
      <p>${esc(item)}</p>
    </div>`).join("")

  const nextIdeaItems = nextIdeas.map((item, i) => `
    <div class="item">
      <span class="badge green">${i + 1}</span>
      <p>${esc(item)}</p>
    </div>`).join("")

  const competitorSection = cc ? `
    <div class="section">
      <h2>④ 競合比較（補足説明）</h2>
      <p class="time-hint">約2分</p>
      <p class="intro">競合動画と比較した場合の分析です。</p>
      <h3>競合の強み</h3>
      <ul>${cc.competitorStrengths.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      <h3>自社の改善余地</h3>
      <ul>${cc.yourWeaknesses.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      <h3>優先改善ポイント</h3>
      <ul>${cc.priorityImprovements.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    </div>` : ""

  const improvementSectionNum = cc ? "⑤" : "④"
  const nextIdeaSectionNum = cc ? "⑥" : "⑤"
  const summarySectionNum = cc ? "⑦" : "⑥"

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f8f9fa; color: #1e293b; font-family: "Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif; padding: 32px; font-size: 14px; line-height: 1.8; }
  @page { size: A4; margin: 16mm; }
  h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
  h2 { font-size: 16px; font-weight: 700; color: #4f46e5; margin: 0 0 4px; }
  h3 { font-size: 13px; font-weight: 700; color: #475569; margin: 12px 0 4px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  p { margin-bottom: 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
  .header-right { text-align: right; font-size: 12px; color: #64748b; }
  .header-right strong { display: block; font-size: 14px; color: #1e293b; }
  .video-meta { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .video-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .meta-item label { font-size: 11px; color: #64748b; display: block; }
  .meta-item span { font-size: 13px; font-weight: 600; }
  .score-bar { background: #e2e8f0; border-radius: 4px; height: 8px; margin: 6px 0; overflow: hidden; }
  .score-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 4px; width: ${score}%; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
  .time-hint { font-size: 11px; color: #94a3b8; margin-bottom: 12px; }
  .intro { background: #f1f5f9; border-left: 3px solid #4f46e5; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 12px; font-style: italic; }
  .script-box { background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 14px; margin: 8px 0; }
  .script-box .label { font-size: 10px; font-weight: 700; color: #4f46e5; letter-spacing: .1em; margin-bottom: 6px; }
  .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .analysis-card { border-left: 3px solid #4f46e5; padding: 10px 14px; background: #f8faff; border-radius: 0 6px 6px 0; page-break-inside: avoid; }
  .analysis-card .card-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; color: #4f46e5; margin-bottom: 2px; }
  .analysis-card .card-value { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .analysis-card .card-desc { font-size: 12px; color: #475569; }
  .analysis-card.yellow { border-color: #f59e0b; } .analysis-card.yellow .card-label { color: #f59e0b; }
  .analysis-card.green { border-color: #10b981; } .analysis-card.green .card-label { color: #10b981; }
  .analysis-card.purple { border-color: #8b5cf6; } .analysis-card.purple .card-label { color: #8b5cf6; }
  .item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; }
  .item p { margin: 0; }
  .badge { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .badge.purple { background: #7c3aed; }
  .badge.green { background: #10b981; }
  .qa-item { margin-bottom: 14px; page-break-inside: avoid; }
  .qa-q { font-weight: 700; color: #4f46e5; margin-bottom: 4px; }
  .qa-a { padding-left: 16px; color: #475569; }
  @media print { button { display: none !important; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <p style="font-size:10px;letter-spacing:.2em;color:#94a3b8;margin-bottom:4px">PRESENTATION SCRIPT</p>
    <h1>プレゼンテーション台本</h1>
    ${clientCompany ? `<p style="font-size:13px;color:#475569;margin-top:4px">${esc(clientCompany)}${clientName ? ` ${esc(clientName)} 様` : ""}</p>` : ""}
  </div>
  <div class="header-right">
    <strong>${today}</strong>
    作成者: ${esc(accountMemo || "担当者")}
  </div>
</div>

<div class="video-meta">
  <div class="video-meta-grid">
    <div class="meta-item"><label>動画タイトル</label><span>${esc(videoInfo.title)}</span></div>
    <div class="meta-item"><label>チャンネル</label><span>${esc(accountMemo || videoInfo.channelName)}</span></div>
    ${videoInfo.views ? `<div class="meta-item"><label>再生数</label><span>${videoInfo.views.toLocaleString("ja-JP")}</span></div>` : ""}
    ${videoInfo.publishedAt ? `<div class="meta-item"><label>公開日</label><span>${esc(videoInfo.publishedAt)}</span></div>` : ""}
  </div>
  <div style="margin-top:12px">
    <label style="font-size:11px;color:#64748b">視聴維持率スコア：<strong>${score}点 / 100点（${scoreLabel}）</strong></label>
    <div class="score-bar"><div class="score-fill"></div></div>
  </div>
</div>

<div class="section">
  <h2>① 挨拶・はじめに</h2>
  <p class="time-hint">約1分</p>
  <div class="script-box">
    <div class="label">★ 開始トーク</div>
    <p>本日はお時間をいただきありがとうございます。今回ご提出するのは「${esc(videoInfo.title)}」の動画分析レポートです。AIを活用した詳細な分析を行いましたので、改善提案を含めてご説明させていただきます。</p>
  </div>
</div>

<div class="section">
  <h2>② 分析概要</h2>
  <p class="time-hint">約2分</p>
  <div class="script-box">
    <div class="label">★ 概要トーク</div>
    <p>まずこちらの動画の全体的な評価ですが、視聴維持率スコアは<strong>${score}点</strong>で「${scoreLabel}」という結果になりました。${(analysis.retentionReasons ?? []).length > 0 ? `その理由として、${esc((analysis.retentionReasons ?? []).join("、"))}といった点が挙げられます。` : ""}</p>
  </div>
</div>

<div class="section">
  <h2>③ 詳細分析</h2>
  <p class="time-hint">約3分</p>
  <div class="analysis-grid">
    <div class="analysis-card"><div class="card-label">HOOK（フック）</div><div class="card-value">${esc(analysis.hook?.value)}</div><div class="card-desc">${esc(analysis.hook?.description)}</div></div>
    <div class="analysis-card yellow"><div class="card-label">EMOTION（感情設計）</div><div class="card-value">${esc(analysis.emotion?.value)}</div><div class="card-desc">${esc(analysis.emotion?.description)}</div></div>
    <div class="analysis-card green"><div class="card-label">CTA（行動喚起）</div><div class="card-value">${esc(analysis.cta?.value)}</div><div class="card-desc">${esc(analysis.cta?.description)}</div></div>
    <div class="analysis-card purple"><div class="card-label">STRUCTURE（構成）</div><div class="card-value">${esc(analysis.structure?.value)}</div><div class="card-desc">${esc(analysis.structure?.description)}</div></div>
  </div>
  <div class="script-box">
    <div class="label">★ 詳細説明トーク</div>
    <p>特に注目していただきたいのはフックの部分です。「${esc(analysis.hook?.value)}」という手法が使われており、${esc(analysis.hook?.description)}。感情設計の観点では「${esc(analysis.emotion?.value)}」が効果的に機能しています。</p>
  </div>
</div>

${competitorSection}

<div class="section">
  <h2>${improvementSectionNum} 改善提案</h2>
  <p class="time-hint">約3分</p>
  <p class="intro">以下の改善点を実施することで、さらなる成果向上が期待できます。</p>
  ${improvementItems || "<p style='color:#94a3b8'>改善提案データなし</p>"}
</div>

<div class="section">
  <h2>${nextIdeaSectionNum} 次回コンテンツ案</h2>
  <p class="time-hint">約2分</p>
  <p class="intro">今回の分析結果をもとに、次回の動画コンテンツとして以下のアイデアをご提案します。</p>
  ${nextIdeaItems || "<p style='color:#94a3b8'>次回コンテンツ案データなし</p>"}
</div>

<div class="section">
  <h2>${summarySectionNum} まとめ・質疑応答</h2>
  <p class="time-hint">約2分</p>
  <div class="script-box">
    <div class="label">★ まとめトーク</div>
    <p>以上が今回の分析結果のご説明となります。視聴維持率スコア${score}点という結果を踏まえ、特に改善提案の${improvements.length > 0 ? `①〜③番目の項目` : "各項目"}から優先的に取り組まれることをおすすめします。ご不明な点がございましたら、何でもご質問ください。</p>
  </div>
  <h3>想定Q&A</h3>
  <div class="qa-item">
    <div class="qa-q">Q. スコアの基準はどのように決まっていますか？</div>
    <div class="qa-a">A. 動画の構成要素（フック・感情設計・CTA・構成）を複合的に評価し、0〜100点でスコア化しています。80点以上が優秀な動画の目安となります。</div>
  </div>
  <div class="qa-item">
    <div class="qa-q">Q. 改善にはどのくらいの時間がかかりますか？</div>
    <div class="qa-a">A. 制作フローの見直し次第ですが、フックの改善だけであれば次回作からすぐに反映可能です。</div>
  </div>
  <div class="qa-item">
    <div class="qa-q">Q. 次回コンテンツ案はどれを優先すべきですか？</div>
    <div class="qa-a">A. 現在のチャンネルのテーマや視聴者層に最も近いものから着手されることをおすすめします。</div>
  </div>
</div>

</body>
</html>`
}

function buildPrompt(req: ReportRequest): string {
  const { analysis, videoInfo, reportType, clientName, clientCompany } = req
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })

  const analysisJson = JSON.stringify(
    {
      hook: analysis.hook,
      emotion: analysis.emotion,
      cta: analysis.cta,
      structure: analysis.structure,
      retentionScore: analysis.retentionScore,
      retentionLabel: analysis.retentionLabel,
      retentionReasons: analysis.retentionReasons,
      improvementIdeas: analysis.improvementIdeas,
      nextVideoIdeas: analysis.nextVideoIdeas,
      competitorComparison: analysis.competitorComparison ?? null,
    },
    null,
    2
  )

  const videoMeta = `
タイトル: ${videoInfo.title}
チャンネル: ${videoInfo.channelName}
再生数: ${videoInfo.views?.toLocaleString("ja-JP") ?? "不明"}
動画時間: ${videoInfo.durationSeconds ? `${Math.floor(videoInfo.durationSeconds / 60)}分${videoInfo.durationSeconds % 60}秒` : "不明"}
公開日: ${videoInfo.publishedAt ?? "不明"}
`

  if (reportType === "internal") {
    return `以下の動画分析結果をもとに、自分用の内部レポートをHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ（必ずこのデータをそのままHTMLに埋め込むこと。プレースホルダー禁止）
${analysisJson}

## 要件
- 日本語で記述
- 上記の分析データの値をそのままHTMLに埋め込む（空のボックスを作らない）
- 全データを詳細に記載（改善アイデア・次の動画アイデアも全て）
- 視聴維持率スコアをグラフ的に表現（CSSで）
- ダークテーマ（背景 #0f1117、テキスト #e2e8f0）
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- マークダウンのコードブロック（\`\`\`html）は使わず、HTMLを直接返す
- インラインCSSのみ使用（外部CSSなし）
- 日付: ${today}
- レイアウト：A4横向きに最適化
- 改善提案・次の動画アイデアはリスト形式で見やすく`
  }

  if (reportType === "client") {
    return `以下の動画分析結果をもとに、クライアント提出用のプロフェッショナルなレポートをHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ
${analysisJson}

## クライアント情報
会社名: ${clientCompany ?? ""}
担当者: ${clientName ?? ""}
日付: ${today}

## 要件
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- マークダウンのコードブロック禁止（HTMLを直接出力）
- **CSSは必ず<style>ブロックにまとめ、インラインstyle属性は使わない**（トークン節約のため）
- ライトテーマ（背景 #ffffff、アクセント #6366f1）、A4縦向き最適化、印刷適合
- 丁寧な日本語（です・ます調）、専門用語を避ける
- 会社名・担当者名・日付をヘッダーに記載
- 改善提案はポジティブな表現で（「〜するとさらに効果的です」など）
- 視聴維持率・改善点を必ず記載
- 次回コンテンツアイデアはnextVideoIdeasの全${(analysis.nextVideoIdeas ?? []).length}件を番号付きで全て記載（省略禁止）
- 各項目に必ず内容テキストを記載（見出しだけで終わらせない）
- 各セクションに page-break-inside: avoid を適用`
  }

  // script
  return `以下の動画分析結果をもとに、クライアントへのプレゼンテーション用台本をHTML形式で生成してください。

## 動画情報
${videoMeta}

## 分析データ
${analysisJson}

## クライアント情報
会社名: ${clientCompany ?? ""}
担当者: ${clientName ?? ""}
日付: ${today}

## 出力要件
- 完全なHTMLを返す（<!DOCTYPE html>から</html>まで）
- マークダウンのコードブロック禁止（HTMLを直接出力）
- **CSSは必ず<style>ブロックにまとめ、インラインstyle属性は使わない**（トークン節約のため）
- ライトテーマ（背景 #f8f9fa）、A4縦向き最適化

## 台本の構成（この順で全て出力すること）
① 挨拶（約1分）
② 分析概要（約2分）
③ 詳細説明：フック・感情設計・CTA・構成（約3分）
④ 改善提案 — improvementIdeasの全${(analysis.improvementIdeas ?? []).length}件を番号付きで、各項目の内容テキストを全て記載（省略禁止）
⑤ 次回コンテンツ案 — nextVideoIdeasの全${(analysis.nextVideoIdeas ?? []).length}件を番号付きで、各項目の内容テキストを全て記載（省略禁止）
⑥ まとめ・質疑応答（想定Q&A含む）

## 文体・表現
- 話し言葉（「〜ですね」「〜なんです」など自然な口語）
- 各セクションに所要時間の目安（「約○分」）を記載
- 重要ポイントには「★」マーク
- page-break-inside: avoid を各セクションに適用`
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium-min")).default
  const puppeteer = (await import("puppeteer-core")).default

  const isLocal = process.env.NODE_ENV !== "production"

  const executablePath = isLocal
    ? undefined
    : await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      )

  const browser = await puppeteer.launch(
    isLocal
      ? { headless: true, channel: "chrome" }
      : {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: chromium.headless,
        }
  )

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16px", right: "16px", bottom: "16px", left: "16px" },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export async function POST(req: NextRequest) {
  // 認証チェック
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

  // Businessプランチェック
  const admin = createSupabaseAdmin()
  const { data: userData } = await admin
    .from("users")
    .select("plan")
    .eq("id", authData.user.id)
    .single()

  if (userData?.plan !== "business") {
    return NextResponse.json({ error: "BUSINESS_PLAN_REQUIRED" }, { status: 403 })
  }

  let body: ReportRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { analysis, videoInfo, reportType, clientName, clientCompany, accountMemo } = body
  if (!analysis || !videoInfo || !reportType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    let html: string
    if (reportType === "internal") {
      html = buildInternalReportHtml({ analysis, videoInfo, reportType, clientName, clientCompany, accountMemo })
    } else if (reportType === "script") {
      // 台本は静的テンプレートで生成（Claude不要・切り捨てなし）
      html = buildScriptReportHtml({ analysis, videoInfo, reportType, clientName, clientCompany, accountMemo })
    } else {
      // クライアント用のみClaudeで生成
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildPrompt({ analysis, videoInfo, reportType, clientName, clientCompany }),
          },
        ],
      })
      html = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
      html = html.replace(/^```html\s*/i, "").replace(/\s*```\s*$/, "")
    }

    // client/script はHTMLをブラウザで開いてprint→PDF
    if (reportType !== "internal") {
      const printBtn = `<div style="position:fixed;top:16px;right:16px;z-index:9999;display:flex;gap:8px">
        <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨 PDFで保存</button>
        <button onclick="window.close()" style="background:#374151;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer">✕</button>
      </div><style>@media print{button{display:none!important}}</style>`
      html = html.replace(/<body[^>]*>/i, (m) => `${m}${printBtn}`)
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Report-Type": "html" },
      })
    }

    // 内部用のみPDF変換
    const pdfBuffer = await htmlToPdf(html)

    const typeLabels: Record<ReportType, string> = {
      internal: "内部用",
      client: "クライアント用",
      script: "台本",
    }
    const filename = `分析レポート_${typeLabels[reportType]}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    console.error("[generate-report] error", e)
    return NextResponse.json({ error: "レポート生成に失敗しました" }, { status: 500 })
  }
}
