export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
      <p className="mt-4 text-sm text-gray-300">
        決済が完了した場合、プランは自動で更新されます。反映まで数十秒かかることがあります。
      </p>
      <a
        href="/"
        className="mt-8 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-5 py-2 text-sm font-semibold text-white"
      >
        TOPへ戻る
      </a>
    </main>
  )
}
