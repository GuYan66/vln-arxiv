"""每日编排入口。

用法：
  python fetcher/run_daily.py --days 3 --dry-run       # 只抓取+本地过滤，不调 GLM，打印候选
  python fetcher/run_daily.py --days 3 --limit 3       # 只对前 3 篇调 GLM，用于验证
  python fetcher/run_daily.py --days 3                 # 正式运行（默认上限 30 篇/天）

环境变量：
  LLM_API_KEY    LLM 网关的 API key（必填，除非 --dry-run）
  LLM_BASE_URL   OpenAI 兼容基址（默认智谱官网 https://open.bigmodel.cn/api/paas/v4；
                 地瓜网关用 https://ai-api.d-robotics.cc/v1）
  LLM_MODEL      模型名（默认 glm-4.6；地瓜网关可填 glm-5.2 等）
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
    ap.add_argument("--days", type=int, default=7, help="抓取最近 N 天（默认 7，含当天，滚动一周）")
    ap.add_argument("--limit", type=int, default=30, help="每日最多总结的新论文数（默认 30；复用缓存的不计）")
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

    api_key = os.environ.get("LLM_API_KEY", "").strip()
    if not api_key:
        print("错误：缺少 LLM_API_KEY 环境变量（--dry-run 可跳过）", file=sys.stderr)
        return 2

    # 延迟导入，避免 dry-run 也强制要求 requests/glm 依赖
    from glm_summarizer import summarize_batch
    from models import PaperSummary

    base_url = os.environ.get("LLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4").strip()
    model = os.environ.get("LLM_MODEL", "glm-4.6").strip()

    # 总结缓存：已总结过的论文复用，不重复调 LLM（省钱）。
    cache = store.load_summaries(repo_root)
    new_papers_raw = [p for p in candidates if p.arxiv_id not in cache]
    cached_count = len(candidates) - len(new_papers_raw)
    print(f"[2/4] 候选 {len(candidates)} 篇：新增 {len(new_papers_raw)}，复用缓存 {cached_count}")

    to_summarize = new_papers_raw[: args.limit]
    skipped_unsummarized = len(new_papers_raw) - len(to_summarize)
    if skipped_unsummarized > 0:
        print(f"      超过 --limit {args.limit}，{skipped_unsummarized} 篇今日暂未总结（次日有额度再补）")

    if to_summarize:
        print(f"[3/4] 调用 LLM 总结 {len(to_summarize)} 篇（{base_url} · {model}）…")
        summaries = summarize_batch(
            to_summarize,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
        for raw, summ in zip(to_summarize, summaries):
            # 只缓存真正调用过 LLM 的（含失败降级，避免无限重试）
            cache[raw.arxiv_id] = summ.model_dump()
    else:
        print("[3/4] 无新论文需总结")
        summaries = []
    store.save_summaries(repo_root, cache)

    # bundle 包含全部候选（滚动窗口）：新增的用刚算的总结，旧的复用缓存。
    today = _today_utc()
    papers: list[Paper] = []
    for raw in candidates:
        summ_dict = cache.get(raw.arxiv_id, {})
        summ = (
            PaperSummary.model_validate(summ_dict)
            if summ_dict
            else PaperSummary()
        )
        papers.append(
            Paper(
                **raw.model_dump(),
                **summ.model_dump(),
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
    index = store.load_index(repo_root)
    store.upsert_index(index, papers, rel)
    store.save_index(repo_root, index)

    print(f"[4/4] 已写入 {rel}（含 {len(papers)} 篇滚动窗口论文），缓存共 {len(cache)} 篇")
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
