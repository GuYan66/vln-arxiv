"""每日编排入口。

用法：
  python fetcher/run_daily.py --days 3 --dry-run       # 只抓取+本地过滤，不调 GLM，打印候选
  python fetcher/run_daily.py --days 3 --limit 3       # 只对前 3 篇调 GLM，用于验证
  python fetcher/run_daily.py --days 3                 # 正式运行（默认上限 30 篇/天）

环境变量：
  ZHIPU_API_KEY   智谱 API key（必填，除非 --dry-run）
  GLM_MODEL       模型名（默认 glm-4.6；按你账号支持的填，如更新的 glm-5.x）
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# 让 `python fetcher/run_daily.py` 能 import 同目录模块
sys.path.insert(0, str(Path(__file__).resolve().parent))

from arxiv_source import fetch_recent  # noqa: E402
from keywords import CATEGORIES  # noqa: E402
from models import DayBundle, Paper  # noqa: E402
import store  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def main() -> int:
    ap = argparse.ArgumentParser(description="arXiv VLN/UAV-VLN 每日抓取与总结")
    ap.add_argument("--days", type=int, default=3, help="抓取最近 N 天（默认 3，跨周末）")
    ap.add_argument("--limit", type=int, default=30, help="每日最多总结的论文数（默认 30）")
    ap.add_argument("--dry-run", action="store_true", help="只抓取与本地过滤，不调 GLM")
    ap.add_argument("--repo-root", default=str(REPO_ROOT), help="仓库根目录")
    args = ap.parse_args()

    repo_root = Path(args.repo_root)

    print(f"[1/4] 查询 arXiv 最近 {args.days} 天 …")
    candidates, query = fetch_recent(days=args.days)
    print(f"      命中候选 {len(candidates)} 篇（本地过滤后）")
    print(f"      查询串: {query[:120]}…")

    if args.dry_run:
        print("\n—— dry-run：候选论文列表 ——")
        for p in candidates:
            tags = ", ".join(p.matched_keywords[:4])
            print(f"  [{p.published[:10]}] {p.arxiv_id}  {p.title[:80]}")
            print(f"      关键词命中: {tags}  UAV提示={p.is_uav_hint}")
        print(f"\n共 {len(candidates)} 篇候选。dry-run 结束，未调用 GLM。")
        return 0

    api_key = os.environ.get("ZHIPU_API_KEY", "").strip()
    if not api_key:
        print("错误：缺少 ZHIPU_API_KEY 环境变量（--dry-run 可跳过）", file=sys.stderr)
        return 2

    # 延迟导入，避免 dry-run 也强制要求 requests/glm 依赖
    from glm_summarizer import summarize_batch

    index = store.load_index(repo_root)
    known = store.known_ids(index)
    new_papers_raw = [p for p in candidates if p.arxiv_id not in known]
    skipped_known = len(candidates) - len(new_papers_raw)
    print(f"[2/4] 去重后新增 {len(new_papers_raw)} 篇（跳过已存在 {skipped_known} 篇）")

    to_summarize = new_papers_raw[: args.limit]
    skipped_unsummarized = len(new_papers_raw) - len(to_summarize)
    if skipped_unsummarized > 0:
        print(f"      超过 --limit {args.limit}，{skipped_unsummarized} 篇仅抓取不总结")

    print(f"[3/4] 调用 GLM 总结 {len(to_summarize)} 篇 …")
    summaries = summarize_batch(
        to_summarize,
        api_key=api_key,
        model=os.environ.get("GLM_MODEL", "glm-4.6"),
    )

    today = _today_utc()
    papers: list[Paper] = []
    for raw, summ in zip(to_summarize, summaries):
        papers.append(
            Paper(
                **raw.model_dump(),
                **summ.model_dump(exclude_unset=False),
                fetch_date=today,
            )
        )

    bundle = DayBundle(
        date=today,
        categories=list(CATEGORIES),
        query=query,
        papers=papers,
        summarized_count=len([p for p in papers if p.relevance_score is not None]),
        skipped_no_summary=skipped_unsummarized,
    )
    rel = store.save_day_bundle(repo_root, bundle)
    store.upsert_index(index, papers, rel)
    store.save_index(repo_root, index)

    print(f"[4/4] 已写入 {rel}，索引共 {len(index.papers)} 篇")
    scored = [p for p in papers if p.relevance_score is not None]
    if scored:
        avg = sum(p.relevance_score for p in scored) / len(scored)
        top = sorted(scored, key=lambda x: x.relevance_score, reverse=True)[:3]
        print(f"      平均推荐度 {avg:.1f}/10；Top3:")
        for p in top:
            print(f"        {p.relevance_score}/10  {p.arxiv_id}  {p.title[:60]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
