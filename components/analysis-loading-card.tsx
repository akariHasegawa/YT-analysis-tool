interface AnalysisLoadingCardProps {
  title: string
  subtitle: string
}

/** AI 分析待ちの中央カード（文言は呼び出し側で i18n） */
export function AnalysisLoadingCard({ title, subtitle }: AnalysisLoadingCardProps) {
  return (
    <div className="glass-card neon-card-glow mx-auto w-full max-w-md rounded-2xl px-8 py-12 text-center sm:px-10 sm:py-14">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[oklch(0.55_0.15_260_/_0.35)] bg-[oklch(0.2_0.06_270_/_0.5)] shadow-[0_0_24px_oklch(0.55_0.2_270_/_0.2)]">
        <div
          className="h-9 w-9 rounded-full border-2 border-[oklch(0.45_0.08_270_/_0.5)] border-t-[oklch(0.78_0.16_240)] border-r-[oklch(0.65_0.2_300)] animate-spin"
          style={{ animationDuration: "0.9s" }}
          aria-hidden
        />
      </div>
      <p className="text-lg font-semibold tracking-wide text-foreground sm:text-xl">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>
    </div>
  )
}
