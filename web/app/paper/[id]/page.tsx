import Link from "next/link";
import { ArrowLeft, Plane, FileText, AlertTriangle } from "lucide-react";
import { getAllPapers, getPaperById, getRelated } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatDate } from "@/lib/utils";
import type { Paper } from "@/lib/types";

export function generateStaticParams() {
  const papers = getAllPapers().map((p) => ({ id: p.arxiv_id }));
  // Next 15 在 output:export 下要求动态路由的 generateStaticParams 不能返回空数组
  // （否则报 "missing generateStaticParams"）。首次抓取前无数据时给一个哨兵占位，
  // 让构建通过；Inner 会对未知 id 显示友好提示。生产环境（GHA 先抓取后构建）总有真实数据。
  return papers.length > 0 ? papers : [{ id: "_" }];
}

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Inner id={id} />;
}

function Inner({ id }: { id: string }) {
  const paper = getPaperById(id);
  if (!paper) {
    const total = getAllPapers().length;
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-stone-500">
        {total === 0
          ? "暂无数据。等 GitHub Actions 跑完每日抓取后，这里会显示论文。"
          : "未找到该论文。"}
        <div className="mt-4">
          <Link href="/" className="text-sky-600 hover:underline">返回列表</Link>
        </div>
      </main>
    );
  }
  return <PaperDetail paper={paper} />;
}

function PaperDetail({ paper }: { paper: Paper }) {
  const related = getRelated(paper, 5);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
        <ArrowLeft className="h-4 w-4" /> 返回列表
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <ScoreBadge score={paper.relevance_score} />
          {paper.is_uav_vln && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Plane className="h-3 w-3" /> UAV-VLN
            </span>
          )}
          {paper.summarize_error && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> 总结失败
            </span>
          )}
          <span className="text-xs text-stone-500">{paper.primary_category}</span>
        </div>

        <h1 className="text-xl font-bold leading-snug text-stone-900 dark:text-stone-100">
          {paper.title}
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {paper.authors.join(", ")}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          发布 {formatDate(paper.published)} · 更新 {formatDate(paper.updated)} · 抓取 {paper.fetch_date}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a href={paper.abs_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
            <FileText className="h-4 w-4" /> arXiv 页
          </a>
          <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
            PDF
          </a>
          <FavoriteButton id={paper.arxiv_id} />
        </div>

        {paper.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {paper.tags.map((t) => (
              <span key={t} className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                {t}
              </span>
            ))}
          </div>
        )}

        {paper.summary_cn && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">中文总结</h2>
            <p className="mt-1 text-stone-800 dark:text-stone-200 leading-relaxed">{paper.summary_cn}</p>
          </section>
        )}

        {paper.highlights.length > 0 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">亮点</h2>
            <ul className="mt-1 space-y-1">
              {paper.highlights.map((h, i) => (
                <li key={i} className="text-stone-800 dark:text-stone-200">• {h}</li>
              ))}
            </ul>
          </section>
        )}

        {paper.relevance_reason && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">相关度理由</h2>
            <p className="mt-1 text-stone-700 dark:text-stone-300">{paper.relevance_reason}</p>
          </section>
        )}

        {paper.summarize_error && (
          <section className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">总结失败：{paper.summarize_error}</p>
            <details className="mt-1">
              <summary className="cursor-pointer opacity-70">模型原始输出</summary>
              <pre className="mt-1 whitespace-pre-wrap text-xs opacity-80">{paper.raw_model_output}</pre>
            </details>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">原始摘要</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {paper.abstract}
          </p>
        </section>

        {related.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">相关论文</h2>
            <ul className="mt-2 space-y-1.5">
              {related.map((r) => (
                <li key={r.arxiv_id} className="text-sm">
                  <Link href={`/paper/${r.arxiv_id}/`} className="text-sky-700 hover:underline dark:text-sky-400">
                    {r.title}
                  </Link>
                  <span className="ml-2 text-xs text-stone-400">
                    {r.relevance_score ?? "—"}/10 · {r.primary_category}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
