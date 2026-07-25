"""读写 data/ JSON 存储，并维护去重索引 index.json。

仓库布局：
  data/index.json               汇总索引（id→精简项），去重主依据
  data/papers/papers-YYYY-MM-DD.json   单日论文 bundle
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from models import DayBundle, Index, IndexEntry, Paper


def _data_dir(repo_root: Path) -> Path:
    d = repo_root / "data"
    (d / "papers").mkdir(parents=True, exist_ok=True)
    return d


def _index_path(repo_root: Path) -> Path:
    return _data_dir(repo_root) / "index.json"


def load_index(repo_root: Path) -> Index:
    p = _index_path(repo_root)
    if not p.exists():
        return Index()
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return Index.model_validate(raw)
    except Exception:
        # 索引损坏不致命，重建即可
        return Index()


def save_index(repo_root: Path, index: Index) -> None:
    p = _index_path(repo_root)
    index.last_updated = datetime.now(timezone.utc).isoformat()
    p.write_text(
        json.dumps(index.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def known_ids(index: Index) -> set[str]:
    return set(index.papers.keys())


def save_day_bundle(repo_root: Path, bundle: DayBundle) -> Path:
    rel = f"papers/papers-{bundle.date}.json"
    p = _data_dir(repo_root) / rel
    p.write_text(
        json.dumps(bundle.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return rel


def upsert_index(
    index: Index,
    papers: list[Paper],
    bundle_rel_path: str,
) -> None:
    """把当日论文并入索引。已存在的 id 不覆盖（保留首次抓取日）。"""
    for paper in papers:
        if paper.arxiv_id in index.papers:
            continue
        index.papers[paper.arxiv_id] = IndexEntry(
            arxiv_id=paper.arxiv_id,
            title=paper.title,
            date=paper.fetch_date,
            relevance_score=paper.relevance_score,
            is_uav_vln=paper.is_uav_vln,
            primary_category=paper.primary_category,
            path=bundle_rel_path,
        )


def load_day_bundle(repo_root: Path, date: str) -> DayBundle | None:
    p = _data_dir(repo_root) / f"papers/papers-{date}.json"
    if not p.exists():
        return None
    try:
        return DayBundle.model_validate(json.loads(p.read_text(encoding="utf-8")))
    except Exception:
        return None
