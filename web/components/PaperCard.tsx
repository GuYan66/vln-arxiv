"use client";

import Link from "next/link";
import { Star, Plane, FileText } from "lucide-react";
import type { Paper } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { ScoreBadge } from "./ScoreBadge";
import { formatDate, cn } from "@/lib/utils";

export function PaperCard({ paper }: { paper: Paper }) {
  const { has, toggle } = useFavorites();
  const fav = has(paper.arxiv_id);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScoreBadge score={paper.relevance_score} />
            {paper.is_uav_vln && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Plane className="h-3 w-3" /> UAV-VLN
              </span>
            )}
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {paper.primary_category}
            </span>
            <span className="text-xs text-stone-400">{formatDate(paper.published)}</span>
          </div>
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
            <Link href={`/paper/${paper.arxiv_id}/`} className="hover:underline">
              {paper.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 line-clamp-2">
            {paper.summary_cn || paper.abstract}
          </p>
          {paper.highlights.length > 0 && (
            <ul className="mt-2 text-xs text-stone-500 dark:text-stone-400 space-y-0.5">
              {paper.highlights.slice(0, 2).map((h, i) => (
                <li key={i} className="line-clamp-1">• {h}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => toggle(paper.arxiv_id)}
          aria-label={fav ? "取消收藏" : "收藏"}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition",
            fav
              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950"
              : "text-stone-300 hover:bg-stone-100 dark:text-stone-600 dark:hover:bg-stone-800"
          )}
        >
          <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs">
        <a
          href={paper.abs_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          <FileText className="h-3 w-3" /> arXiv
        </a>
        <a
          href={paper.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          PDF
        </a>
      </div>
    </article>
  );
}
