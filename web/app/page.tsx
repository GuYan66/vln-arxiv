import { Radar } from "lucide-react";
import { getBundles, getUniquePapers, getStats } from "@/lib/data";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  const bundles = getBundles();
  const uniquePapers = getUniquePapers();
  const stats = getStats();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* 头部 */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              VLN arXiv 监测台
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              视觉语言导航 · 无人机 VLN · 每日自动抓取
            </p>
          </div>
        </div>

        {stats.total > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="去重论文" value={stats.total} />
            <StatTile label="UAV-VLN" value={stats.uav} accent="sky" />
            <StatTile label="抓取天数" value={stats.days} />
            <StatTile
              label="平均推荐度"
              value={`${stats.avgScore.toFixed(1)}`}
              accent="emerald"
            />
          </div>
        )}
      </header>

      <Dashboard bundles={bundles} uniquePapers={uniquePapers} />

      <footer className="mt-10 border-t border-stone-200 pt-4 text-xs text-stone-400 dark:border-stone-800">
        每日 UTC 00:17 自动抓取 · arXiv + LLM 总结评分 ·{" "}
        <a
          href="https://github.com/GuYan66/vln-arxiv"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-stone-600 dark:hover:text-stone-300"
        >
          源码
        </a>
      </footer>
    </main>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "sky" | "emerald";
}) {
  const color =
    accent === "sky"
      ? "text-sky-600 dark:text-sky-400"
      : accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-stone-800 dark:text-stone-100";
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900">
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-stone-500 dark:text-stone-400">{label}</div>
    </div>
  );
}
