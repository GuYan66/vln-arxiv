"use client";

import Link from "next/link";
import { Star, Plane, FileText, ChevronRight } from "lucide-react";
import type { Paper } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { ScoreBadge } from "./ScoreBadge";
import { formatDate } from "@/lib/utils";

export function PaperCard({ paper }: { paper: Paper }) {
  const { has, toggle } = useFavorites();
  const fav = has(paper.arxiv_id);

  return (
    <article className="card-hover group rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <ScoreBadge score={paper.relevance_score} />
            {paper.is_uav_vln && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <Plane className="h-3 w-3" /> UAV-VLN
              </span>
            )}
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {paper.primary_category}
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {formatDate(paper.published)}
            </span>
          </div>

          <h3 className="font-semibold leading-snug text-stone-900 dark:text-stone-100">
            <Link
              href={`/paper/${paper.arxiv_id}/`}
              className="hover:text-sky-700 dark:hover:text-sky-400"
            >
              {paper.title}
            </Link>
          </h3>

          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {paper.summary_cn || paper.abstract}
          </p>

          {paper.highlights.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-stone-500 dark:text-stone-500">
              {paper.highlights.slice(0, 2).map((h, i) => (
                <li key={i} className="line-clamp-1">
                  <span className="text-stone-300 dark:text-stone-600">·</span> {h}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => toggle(paper.arxiv_id)}
            aria-label={fav ? "取消收藏" : "收藏"}
            className={
              "rounded-lg p-1.5 transition " +
              (fav
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                : "text-stone-300 hover:bg-stone-100 dark:text-stone-600 dark:hover:bg-stone-800")
            }
          >
            <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
          </button>
          <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 dark:text-stone-600" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-stone-100 pt-2.5 text-xs dark:border-stone-800">
        <a
          href={paper.abs_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
        >
          <FileText className="h-3 w-3" /> arXiv
        </a>
        <a
          href={paper.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
        >
          PDF
        </a>
      </div>
    </article>
  );
}
