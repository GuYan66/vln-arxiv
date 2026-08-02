import { getBundles, getUniquePapers, getStats } from "@/lib/data";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  const bundles = getBundles();
  const uniquePapers = getUniquePapers();
  const stats = getStats();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          VLN arXiv 监测台
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          视觉语言导航 / 无人机 VLN 方向 · 每日自动抓取 · LLM 中文总结与评分
        </p>
        {stats.total > 0 && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-500">
            <span>去重共 {stats.total} 篇</span>
            <span>UAV-VLN {stats.uav} 篇</span>
            <span>覆盖 {stats.days} 个抓取日</span>
            <span>平均推荐度 {stats.avgScore.toFixed(1)}/10</span>
          </div>
        )}
      </header>

      <Dashboard bundles={bundles} uniquePapers={uniquePapers} />
    </main>
  );
}
