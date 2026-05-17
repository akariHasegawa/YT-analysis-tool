import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "プライバシーポリシー | AIAI-short",
  description: "AIAI-shortのプライバシーポリシー",
}

export default function PrivacyPage() {
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
          <h1 className="mt-6 text-3xl font-bold text-white">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-gray-500">最終更新日：2026年5月17日</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第1条（収集する情報）</h2>
            <p className="mb-3">本サービス（AIAI-short）およびChrome拡張機能は、以下の情報を収集します。</p>
            <ul className="list-disc space-y-2 pl-5 text-gray-400">
              <li>メールアドレス（アカウント登録時）</li>
              <li>GoogleアカウントのID・メールアドレス（Google認証でログインした場合）</li>
              <li>TikTok・Instagram Reelsの動画URL、タイトル、チャンネル名</li>
              <li>動画のいいね数・コメント数</li>
              <li>動画のハッシュタグ・BGM情報</li>
              <li>動画のコメント文（上位10件）</li>
              <li>ご利用プラン・分析回数</li>
              <li>認証トークン（ログイン状態の維持のため、拡張機能のローカルストレージに保存）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第2条（情報の利用目的）</h2>
            <ul className="list-disc space-y-2 pl-5 text-gray-400">
              <li>AI分析機能の提供</li>
              <li>ユーザー認証・ログイン状態の管理</li>
              <li>利用プランの管理・請求処理（Stripe）</li>
              <li>サービスの改善・障害対応</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第3条（第三者への提供）</h2>
            <p className="mb-3">収集した情報は、以下の場合を除き第三者に提供しません。</p>
            <ul className="list-disc space-y-2 pl-5 text-gray-400">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>サービス提供のために利用する外部サービス（OpenAI、Supabase、Stripe）への提供。これらのサービスはそれぞれのプライバシーポリシーに従って情報を取り扱います。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第4条（Chrome拡張機能について）</h2>
            <p className="mb-3">Chrome拡張機能は以下の動作を行います。</p>
            <ul className="list-disc space-y-2 pl-5 text-gray-400">
              <li>TikTok・Instagram閲覧中に動画情報（URL、タイトル、いいね数、コメント数、ハッシュタグ、BGM、コメント文）をページから取得します</li>
              <li>取得したデータはAIAI-short（yt-analysis-tool-mu.vercel.app）にのみ送信されます</li>
              <li>認証トークンはChromeのローカルストレージに保存され、外部には送信されません</li>
              <li>収集したデータは分析目的以外には使用しません</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第5条（データの保管・削除）</h2>
            <p className="text-gray-400">
              ユーザーデータはSupabaseのサーバーに保管されます。アカウント削除をご希望の場合は、お問い合わせページよりご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第6条（Cookieについて）</h2>
            <p className="text-gray-400">
              本サービスはログイン状態の維持のためにCookieおよびブラウザストレージを使用します。ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">第7条（お問い合わせ）</h2>
            <p className="text-gray-400">
              プライバシーポリシーに関するお問い合わせは
              <Link href="/contact" className="ml-1 text-[#6366f1] hover:underline">
                お問い合わせページ
              </Link>
              よりご連絡ください。
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
