import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "利用規約 | AIAI-short",
  description: "AIAI-shortの利用規約",
}

export default function TermsPage() {
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
          <h1 className="mt-6 text-3xl font-bold text-white">利用規約</h1>
          <p className="mt-2 text-sm text-gray-500">最終更新日：2025年5月1日</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第1条（本規約の適用）</h2>
            <p>
              本利用規約（以下「本規約」）は、当サービス「AIAI-short」（以下「本サービス」）の利用に関する条件を定めるものです。
              本サービスをご利用いただくことで、本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第2条（サービスの内容）</h2>
            <p>
              本サービスは、YouTube・TikTok・Instagram ReelsなどのSNS動画URLを入力することで、
              AIによる動画構造分析・改善提案・コンテンツ生成を行うツールです。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第3条（Chrome拡張機能について）</h2>
            <p className="mb-3">
              本サービスが提供するChrome拡張機能は、TikTok・Instagram Reelsの動画ページに表示されている
              再生数・いいね数・コメント数・字幕等の情報をブラウザ上で取得し、AI分析に活用します。
            </p>
            <p className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-yellow-200/80">
              ⚠️ TikTok・Instagram等の各プラットフォームは予告なくページの構造を変更する場合があります。
              これにより、再生数・いいね数等の数値データが取得できなくなる場合がありますが、
              <strong className="text-yellow-200">AIによる動画分析機能自体には影響しません。</strong>
              数値データの取得不可はサービス障害には該当せず、返金対象とはなりません。
            </p>
            <p>
              なお、Chrome拡張機能の利用は各プラットフォームの利用規約の範囲内でご使用ください。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第4条（料金・返金）</h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>各プランの料金は申し込み時点で表示される金額に従います。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>サービスの性質上、原則として返金はお受けしておりません。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>
                  <strong className="text-gray-200">返金対象となるケース：</strong>
                  AIによる分析機能が完全に動作しない状態が継続している場合。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>
                  <strong className="text-gray-200">返金対象とならないケース：</strong>
                  Chrome拡張機能による数値データ（再生数・いいね数等）の取得ができない場合、
                  分析結果が期待と異なる場合、利用頻度が少ない場合など。
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第5条（禁止事項）</h2>
            <ul className="space-y-2">
              {[
                "本サービスを通じて取得した分析結果を無断で転売・再配布すること",
                "本サービスのシステムに不正アクセスを試みること",
                "他のユーザーや第三者の権利を侵害する行為",
                "法令または公序良俗に反する行為",
                "本サービスの運営を妨害する行為",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 text-[#6366f1]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第6条（免責事項）</h2>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>本サービスのAI分析結果は参考情報であり、成果を保証するものではありません。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>外部サービス（YouTube・TikTok・Instagram・OpenAI等）の障害・仕様変更による影響について、当サービスは責任を負いません。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-[#6366f1]">•</span>
                <span>本サービスの利用によって生じた損害について、当サービスは一切の責任を負いません。</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第7条（サービスの変更・停止）</h2>
            <p>
              当サービスは、事前の予告なくサービスの内容を変更、追加、または停止する場合があります。
              これによりユーザーに生じた損害について責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第8条（規約の変更）</h2>
            <p>
              本規約は必要に応じて変更する場合があります。変更後の規約は本ページに掲載した時点で効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第9条（準拠法・管轄）</h2>
            <p>
              本規約は日本法に準拠し、本サービスに関する紛争については日本国内の裁判所を専属的合意管轄裁判所とします。
            </p>
          </section>

        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400">トップ</Link>
          <span className="mx-3">·</span>
          <Link href="/faq" className="hover:text-gray-400">よくある質問</Link>
        </div>
      </div>
    </div>
  )
}
