// 与 fetcher/models.py 对应的前端类型。

export interface PaperSummary {
  summary_cn: string;
  highlights: string[];
  relevance_score: number | null;
  relevance_reason: string;
  is_uav_vln: boolean;
  tags: string[];
  raw_model_output: string;
  summarized_at: string;
  summarize_error: string | null;
}

export interface Paper {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  primary_category: string;
  categories: string[];
  published: string;
  updated: string;
  pdf_url: string;
  abs_url: string;
  matched_keywords: string[];
  is_uav_hint: boolean;
  // summary fields
  summary_cn: string;
  highlights: string[];
  relevance_score: number | null;
  relevance_reason: string;
  is_uav_vln: boolean;
  tags: string[];
  raw_model_output: string;
  summarized_at: string;
  summarize_error: string | null;
  fetch_date: string;
}

export interface DayBundle {
  date: string;
  categories: string[];
  query: string;
  papers: Paper[];
  summarized_count: number;
  skipped_no_summary: number;
}

export interface IndexEntry {
  arxiv_id: string;
  title: string;
  date: string;
  relevance_score: number | null;
  is_uav_vln: boolean;
  primary_category: string;
  path: string;
}

export interface Index {
  papers: Record<string, IndexEntry>;
  last_updated: string;
}
