import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "よくある質問 | AIAI-short",
  description: "AIAI-shortに関するよくある質問",
}

const faqs = [
  {
    category: "サービスについて",
    items: [
      {
        q: "どのプラットフォームに対応していますか？",
        a: "YouTube・TikTok・Instagram Reelsに対応しています。YouTubeはURLを直接入力するだけで高精度に分析できます。TikTok・InstagramはChrome拡張機能を使うことでより詳細なデータを取得できます。",
      },
      {
        q: "分析にどのくらい時間がかかりますか？",
        a: "通常30秒〜2分程度です。動画の長さや字幕の量によって異なります。",
      },
      {
        q: "分析結果はどのくらい正確ですか？",
        a: "AIによる分析は参考情報であり、成果を保証するものではありません。ただし、動画の構成パターン・フック・CTAなどの構造的な分析は高い精度で行えます。",
      },
    ],
  },
  {
    category: "Chrome拡張機能",
    items: [
      {
        q: "Chrome拡張機能は必須ですか？",
        a: "YouTubeの分析には不要です。TikTok・Instagramの分析時に使うと、再生数・いいね数などの数値データを自動取得できて便利ですが、なくてもAI分析は利用できます。",
      },
      {
        q: "TikTokやInstagramの再生数・いいね数が取得できません",
        a: "TikTok・Instagram等のプラットフォームは予告なくページ構造を変更することがあります。そのため、数値データが取得できない場合があります。ただし、AIによる動画分析機能自体には影響しませんので、分析は引き続きご利用いただけます。数値取得の不具合は返金対象とはなりません。",
      },
      {
        q: "拡張機能はどこからインストールできますか？",
        a: "現在はベータ版として提供しています。AIAI-shortにログイン後、ヘッダーの「Chrome拡張と連携」ボタンから連携できます。",
      },
    ],
  },
  {
    category: "プラン・料金",
    items: [
      {
        q: "無料プランでは何ができますか？",
        a: "初回1回のみ分析をお試しいただけます。",
      },
      {
        q: "プランはいつでも変更できますか？",
        a: "はい、いつでもアップグレード可能です。ダウングレードは次の更新タイミングで適用されます。",
      },
      {
        q: "返金してもらえますか？",
        a: "原則として返金はお受けしておりません。AIによる分析機能が完全に動作しない状態が継続している場合のみ、個別にご相談ください。Chrome拡張による数値データの取得不可・分析結果が期待と異なる場合などは返金対象外となります。詳しくは利用規約をご確認ください。",
      },
      {
        q: "月の途中でプランを変更した場合、分析回数はどうなりますか？",
        a: "アップグレード後は即時に上位プランの回数が適用されます。",
      },
    ],
  },
  {
    category: "分析・機能",
    items: [
      {
        q: "複数の動画を同時に分析できますか？",
        a: "Businessプランでは最大5本の動画を同時に分析し、共通パターンを抽出できます。",
      },
      {
        q: "台本や動画プロンプトはどのように使いますか？",
        a: "台本はそのままSNS投稿の原稿として、動画プロンプトはSora・Runway・Seedanceなどの動画生成AIにそのまま貼り付けてご利用いただけます。",
      },
      {
        q: "分析データはどこかに保存されますか？",
        a: "分析結果はGoogle Sheetsに自動で記録されます（運営側の分析・品質改善目的）。個人を特定できる情報は記録しません。",
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#060810] text-gray-300">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            ← トップに戻る
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-white">よくある質問</h1>
          <p className="mt-2 text-sm text-gray-500">お問い合わせの前にご確認ください</p>
        </div>

        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="mb-6 text-base font-semibold text-[#818cf8]">{section.category}</h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div
                    key={item.q}
                    className="rounded-xl border border-white/8 bg-white/3 p-5"
                  >
                    <p className="mb-2 font-semibold text-white">{item.q}</p>
                    <p className="text-sm leading-relaxed text-gray-400">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400">トップ</Link>
          <span className="mx-3">·</span>
          <Link href="/terms" className="hover:text-gray-400">利用規約</Link>
        </div>
      </div>
    </div>
  )
}
