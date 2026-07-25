"use client";

import { useMemo, useState } from "react";
import { Search, Star, Plane, SlidersHorizontal } from "lucide-react";
import type { Paper } from "@/lib/types";
import { PaperCard } from "./PaperCard";
import { useFavorites } from "@/lib/favorites";

type SortKey = "score" | "date";

export function Dashboard({
  papers,
  dates,
}: {
  papers: Paper[];
  dates: string[];
}) {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0); // 0 = 不限
  const [uavOnly, setUavOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const { ids: favIds } = useFavorites();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = papers.filter((p) => {
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
  }, [papers, query, minScore, uavOnly, favOnly, sort, favIds]);

  return (
    <div className="flex flex-col gap-4">
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
        <span className="text-stone-400 ml-auto">
          共 {filtered.length} 篇
        </span>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
          {papers.length === 0
            ? "暂无数据。等 GitHub Actions 跑完每日抓取后，这里会显示论文。"
            : "没有符合条件的论文，试试放宽筛选。"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <PaperCard key={p.arxiv_id} paper={p} />
          ))}
        </div>
      )}

      {/* 日期快捷跳转（最近几天） */}
      {dates.length > 0 && (
        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer">已抓取日期（{dates.length}）</summary>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <span key={d} className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">{d}</span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
