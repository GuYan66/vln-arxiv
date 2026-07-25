import fs from "node:fs";
import path from "node:path";
import type { DayBundle, Paper } from "./types";

// 数据目录：web/ 的上一级 data/。`next build` 从 web/ 运行，故 ../data 指向仓库 data/。
const DATA_DIR = path.join(process.cwd(), "..", "data");
const PAPERS_DIR = path.join(DATA_DIR, "papers");

interface Loaded {
  bundles: DayBundle[];
  papers: Paper[]; // 全部论文，按 published 倒序
  dates: string[]; // 去重 fetch_date，倒序
}

let cache: Loaded | null = null;

function load(): Loaded {
  if (cache) return cache;
  const bundles: DayBundle[] = [];
  if (fs.existsSync(PAPERS_DIR)) {
    for (const file of fs.readdirSync(PAPERS_DIR).filter((f) => f.endsWith(".json"))) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(PAPERS_DIR, file), "utf-8"));
        bundles.push(raw as DayBundle);
      } catch {
        // 跳过损坏文件
      }
    }
  }
  bundles.sort((a, b) => (a.date < b.date ? 1 : -1));

  const papers: Paper[] = bundles.flatMap((b) => b.papers);
  papers.sort((a, b) => (a.published < b.published ? 1 : -1));

  const dateSet = new Set<string>();
  for (const b of bundles) dateSet.add(b.date);
  const dates = [...dateSet].sort((a, b) => (a < b ? 1 : -1));

  cache = { bundles, papers, dates };
  return cache;
}

export function getAllPapers(): Paper[] {
  return load().papers;
}

export function getDates(): string[] {
  return load().dates;
}

export function getBundles(): DayBundle[] {
  return load().bundles;
}

export function getPaperById(id: string): Paper | undefined {
  return load().papers.find((p) => p.arxiv_id === id);
}

export function getPapersForDate(date: string): Paper[] {
  const b = load().bundles.find((x) => x.date === date);
  return b ? b.papers : [];
}

export function getRelated(paper: Paper, n = 5): Paper[] {
  const tagSet = new Set(paper.tags.map((t) => t.toLowerCase()));
  const all = load().papers.filter((p) => p.arxiv_id !== paper.arxiv_id);
  return all
    .map((p) => {
      const overlap =
        p.tags.filter((t) => tagSet.has(t.toLowerCase())).length +
        (p.primary_category === paper.primary_category ? 1 : 0) +
        (p.is_uav_vln === paper.is_uav_vln && paper.is_uav_vln ? 2 : 0);
      return { p, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || (a.p.published < b.p.published ? 1 : -1))
    .slice(0, n)
    .map((x) => x.p);
}

export function getStats() {
  const { papers, dates } = load();
  const scored = papers.filter((p) => p.relevance_score !== null);
  const uav = papers.filter((p) => p.is_uav_vln);
  const avg =
    scored.length > 0
      ? scored.reduce((s, p) => s + (p.relevance_score ?? 0), 0) / scored.length
      : 0;
  return {
    total: papers.length,
    scored: scored.length,
    uav: uav.length,
    days: dates.length,
    avgScore: avg,
  };
}
