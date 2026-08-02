"use client";

import { useMemo, useState } from "react";
import { Search, Star, Plane, SlidersHorizontal, Calendar, LayoutGrid } from "lucide-react";
import type { DayBundle, Paper } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { useFavorites } from "@/lib/favorites";

type SortKey = "score" | "date";
type Mode = "day" | "all";

export function Dashboard({
  bundles,
  uniquePapers,
}: {
  bundles: DayBundle[];
  uniquePapers: Paper[];
}) {
  const [mode, setMode] = useState<Mode>("day");
  const [selectedDate, setSelectedDate] = useState(bundles[0]?.date ?? "");
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [uavOnly, setUavOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const { ids: favIds } = useFavorites();

  const base: Paper[] = useMemo(() => {
    if (mode === "all") return uniquePapers;
    const b = bundles.find((x) => x.date === selectedDate);
    return b ? b.papers : [];
  }, [mode, selectedDate, bundles, uniquePapers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = base.filter((p) => {
      if (uavOnly && !p.is_uav_vln) return false;
      if (favOnly && !favIds.has(p.arxiv_id)) return false;
      if (minScore > 0 && (p.relevance_score ?? 0) < minScore) return false;
      if (q) {
        const hay = `${p.title} ${p.abstract} ${p.summary_cn} ${p.tags.join(" ")} ${p.authors.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "score") {
        return (b.relevance_score ?? -1) - (a.relevance_score ?? -1) || (a.published < b.published ? 1 : -1);
      }
      return a.published < b.published ? 1 : -1;
    });
    return list;
  }, [base, query, minScore, uavOnly, favOnly, sort, favIds]);

  const currentBundle = bundles.find((x) => x.date === selectedDate);

  return (
    <div className="flex flex-col gap-4">
      {/* 分段模式切换 */}
      <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5 dark:border-stone-800 dark:bg-stone-900">
        <SegBtn active={mode === "day"} onClick={() => setMode("day")}>
          <Calendar className="h-3.5 w-3.5" /> 按日
        </SegBtn>
        <SegBtn active={mode === "all"} onClick={() => setMode("all")}>
          <LayoutGrid className="h-3.5 w-3.5" /> 全部
          <span className="ml-1 rounded bg-stone-300 px-1 text-[10px] tabular-nums text-stone-600 dark:bg-stone-700 dark:text-stone-300">
            {uniquePapers.length}
          </span>
        </SegBtn>
      </div>

      {/* 日期导航 */}
      {mode === "day" && bundles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bundles.map((b) => (
            <button
              key={b.date}
              onClick={() => setSelectedDate(b.date)}
              className={
                "rounded-full px-3 py-1 text-xs transition " +
                (b.date === selectedDate
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800/60 dark:text-stone-400 dark:hover:bg-stone-800")
              }
            >
              {b.date}
              <span className="ml-1 opacity-60">{b.papers.length}</span>
            </button>
          ))}
        </div>
      )}

      {mode === "day" && currentBundle && (
        <p className="text-xs text-stone-500 dark:text-stone-500">
          {currentBundle.date} 的滚动窗口 · 过去 7 天 · {currentBundle.papers.length} 篇（已总结 {currentBundle.summarized_count}）
        </p>
      )}

      {/* 吸附筛选条 */}
      <div className="sticky top-0 z-10 -mx-4 mb-1 bg-[var(--bg)]/85 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题 / 摘要 / 作者…"
              className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-stone-800 dark:bg-stone-900 dark:focus:ring-sky-950"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none dark:border-stone-800 dark:bg-stone-900"
          >
            <option value="score">按推荐度</option>
            <option value="date">按时间</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="inline-flex items-center gap-1 text-xs text-stone-400">
            <SlidersHorizontal className="h-3 w-3" />
          </span>
          <label className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
            <span className="text-xs">推荐度</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-xs dark:border-stone-800 dark:bg-stone-900"
            >
              <option value={0}>不限</option>
              {[4, 6, 7, 8, 9].map((v) => (
                <option key={v} value={v}>≥{v}</option>
              ))}
            </select>
          </label>
          <Check active={uavOnly} onClick={() => setUavOnly((v) => !v)}>
            <Plane className="h-3 w-3 text-sky-500" /> UAV
          </Check>
          <Check active={favOnly} onClick={() => setFavOnly((v) => !v)}>
            <Star className="h-3 w-3 text-amber-500" /> 收藏
          </Check>
          <span className="ml-auto text-xs text-stone-400 tabular-nums">
            {filtered.length} 篇
          </span>
        </div>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700">
          {base.length === 0
            ? "该日期暂无数据。等 GitHub Actions 跑完每日抓取后，这里会显示论文。"
            : "没有符合条件的论文，试试放宽筛选。"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <PaperCard key={p.arxiv_id + p.fetch_date} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition " +
        (active
          ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50"
          : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200")
      }
    >
      {children}
    </button>
  );
}

function Check({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition " +
        (active
          ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
          : "border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600")
      }
    >
      {children}
    </button>
  );
}
