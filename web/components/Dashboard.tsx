"use client";

import { useMemo, useState } from "react";
import { Search, Star, Plane, SlidersHorizontal, Calendar } from "lucide-react";
import type { DayBundle, Paper } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { useFavorites } from "@/lib/favorites";

type SortKey = "score" | "date";

export function Dashboard({
  bundles,
  uniquePapers,
}: {
  bundles: DayBundle[];
  uniquePapers: Paper[];
}) {
  const [mode, setMode] = useState<"day" | "all">("day");
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
      {/* 模式切换：按日 / 全部 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("day")}
          className={
            "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm " +
            (mode === "day"
              ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
              : "border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300")
          }
        >
          <Calendar className="h-3.5 w-3.5" /> 按日
        </button>
        <button
          onClick={() => setMode("all")}
          className={
            "rounded-md border px-3 py-1.5 text-sm " +
            (mode === "all"
              ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
              : "border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300")
          }
        >
          全部（去重 {uniquePapers.length}）
        </button>
      </div>

      {/* 日期导航（仅按日模式） */}
      {mode === "day" && bundles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bundles.map((b) => (
            <button
              key={b.date}
              onClick={() => setSelectedDate(b.date)}
              className={
                "rounded-md px-2 py-1 text-xs " +
                (b.date === selectedDate
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300")
              }
            >
              {b.date}（{b.papers.length}）
            </button>
          ))}
        </div>
      )}

      {mode === "day" && currentBundle && (
        <p className="text-xs text-stone-500">
          {currentBundle.date} 的滚动窗口：过去 7 天（含当天）共 {currentBundle.papers.length} 篇；其中已总结 {currentBundle.summarized_count} 篇。
        </p>
      )}

      {/* 搜索 + 排序 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题 / 摘要 / 作者 / 标签…"
            className="w-full rounded-md border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-stone-700 dark:bg-stone-900"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
        >
          <option value="score">按推荐度</option>
          <option value="date">按时间</option>
        </select>
      </div>

      {/* 筛选条 */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 text-stone-500">
          <SlidersHorizontal className="h-3.5 w-3.5" /> 筛选
        </span>
        <label className="inline-flex items-center gap-1.5">
          最低推荐度
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="rounded border border-stone-300 bg-white px-1.5 py-0.5 dark:border-stone-700 dark:bg-stone-900"
          >
            <option value={0}>不限</option>
            {[4, 6, 7, 8, 9].map((v) => (
              <option key={v} value={v}>≥{v}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={uavOnly}
            onChange={(e) => setUavOnly(e.target.checked)}
            className="accent-sky-600"
          />
          <Plane className="h-3.5 w-3.5 text-sky-600" /> 仅 UAV-VLN
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
            className="accent-amber-500"
          />
          <Star className="h-3.5 w-3.5 text-amber-500" /> 仅收藏
        </label>
        <span className="text-stone-400 ml-auto">共 {filtered.length} 篇</span>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
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
