"""数据模型（pydantic v2）。统一校验，避免脏数据进站点。"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PaperRaw(BaseModel):
    """从 arXiv 抓到的原始论文字段。"""

    arxiv_id: str  # 不带版本号，如 2401.12345
    title: str
    authors: list[str]
    abstract: str
    primary_category: str
    categories: list[str]
    published: str  # ISO 8601
    updated: str  # ISO 8601
    pdf_url: str
    abs_url: str
    matched_keywords: list[str] = Field(default_factory=list)
    is_uav_hint: bool = False  # 本地判据提示，供 GLM 参考


class PaperSummary(BaseModel):
    """GLM 对单篇论文的总结与评分。"""

    summary_cn: str = ""
    highlights: list[str] = Field(default_factory=list)
    relevance_score: Optional[int] = None  # 1-10；解析失败为 None
    relevance_reason: str = ""
    is_uav_vln: bool = False
    tags: list[str] = Field(default_factory=list)
    raw_model_output: str = ""  # 降级时保留原文，便于排查
    summarized_at: str = ""  # ISO 8601
    summarize_error: Optional[str] = None


class Paper(PaperRaw, PaperSummary):
    """完整论文记录（原始 + 总结）。"""

    fetch_date: str = ""  # 抓取日，YYYY-MM-DD


class DayBundle(BaseModel):
    """单日数据文件 papers-YYYY-MM-DD.json 的结构。"""

    date: str
    categories: list[str]
    query: str
    papers: list[Paper]
    summarized_count: int = 0
    skipped_no_summary: int = 0


class IndexEntry(BaseModel):
    """index.json 里每篇论文的精简索引项。"""

    arxiv_id: str
    title: str
    date: str  # 首次抓到日期
    relevance_score: Optional[int]
    is_uav_vln: bool
    primary_category: str
    path: str  # 相对仓库根的 papers 文件路径


class Index(BaseModel):
    """data/index.json：全部论文的汇总索引，用于去重与站点导航。"""

    papers: dict[str, IndexEntry] = Field(default_factory=dict)
    last_updated: str = ""
