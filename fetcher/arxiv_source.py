"""arXiv API 客户端：按学科+关键词查询最近论文。

复用 PyPI `arxiv` 包（封装 Atom 解析与 3 秒限速），再做本地二级过滤。
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

import arxiv

from keywords import build_arxiv_query, matches_local, looks_like_uav
from models import PaperRaw


def _strip_version(short_id: str) -> str:
    """arxiv get_short_id 返回 '2401.12345v1'，去掉版本号得到稳定主键。"""
    return re.sub(r"v\d+$", "", short_id)


def _within_days(published: datetime, days: int) -> bool:
    """published 是否在最近 days 天内（含跨周末）。"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return published >= cutoff


def fetch_recent(
    days: int = 3,
    max_results: int = 400,
) -> tuple[list[PaperRaw], str]:
    """查询最近 days 天的 VLN/UAV-VLN 相关论文。

    返回 (候选论文列表, 使用的查询串)。候选论文已通过本地二级过滤。
    """
    query = build_arxiv_query()
    client = arxiv.Client(num_retries=4, page_size=100)
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
        sort_order=arxiv.SortOrder.Descending,
    )

    out: list[PaperRaw] = []
    seen_ids: set[str] = set()
    for result in client.results(search):
        try:
            published = result.published
        except Exception:
            continue
        if not _within_days(published, days):
            # 结果按提交时间倒序，一旦遇到早于窗口的就可以停。
            # 但 arxiv 排序依据是 submittedDate，跨页可能乱序，保险起见用 continue。
            continue

        arxiv_id = _strip_version(result.get_short_id())
        if arxiv_id in seen_ids:
            continue
        title = (result.title or "").replace("\n", " ").strip()
        abstract = (result.summary or "").replace("\n", " ").strip()
        text = f"{title}\n{abstract}"
        matched = matches_local(text)
        if not matched:
            continue

        authors = [str(a) for a in result.authors]
        pdf_url = result.pdf_url or f"https://arxiv.org/pdf/{arxiv_id}"
        abs_url = f"https://arxiv.org/abs/{arxiv_id}"

        out.append(
            PaperRaw(
                arxiv_id=arxiv_id,
                title=title,
                authors=authors,
                abstract=abstract,
                primary_category=result.primary_category or "",
                categories=list(result.categories or []),
                published=published.isoformat(),
                updated=(result.updated.isoformat() if result.updated else published.isoformat()),
                pdf_url=pdf_url,
                abs_url=abs_url,
                matched_keywords=matched,
                is_uav_hint=looks_like_uav(text),
            )
        )
        seen_ids.add(arxiv_id)

    return out, query
