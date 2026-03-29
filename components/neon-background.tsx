/** 全画面のネオングラデーション背景（装飾のみ） */
export function NeonBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="neon-page-bg absolute inset-0" />
      <div className="absolute inset-0 opacity-[0.04] neon-grid" />
      <div className="absolute -top-40 left-1/2 h-[28rem] w-[min(100%,56rem)] -translate-x-1/2 rounded-full bg-[oklch(0.45_0.2_280_/_0.25)] blur-[100px]" />
      <div className="absolute bottom-0 right-[-20%] h-[20rem] w-[20rem] rounded-full bg-[oklch(0.35_0.18_250_/_0.2)] blur-[80px]" />
      <div className="absolute bottom-1/4 left-[-10%] h-[16rem] w-[16rem] rounded-full bg-[oklch(0.3_0.15_300_/_0.15)] blur-[70px]" />
    </div>
  )
}
