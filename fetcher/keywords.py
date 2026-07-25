"""VLN / UAV-VLN 论文检索配置：学科范围、arXiv 查询关键词、本地二级过滤正则。

这里集中管理检索词，跑几天后想增删术语只改本文件即可。
"""

# arXiv 学科范围。cs.RO 是 VLN/UAV 主战场，cs.CV 视觉，cs.CL 语言，cs.AI/cs.LG 通用，cs.MA 多智能体/无人机。
CATEGORIES: list[str] = [
    "cs.CV",
    "cs.RO",
    "cs.AI",
    "cs.CL",
    "cs.LG",
    "cs.MA",
]

# arXiv API 查询串里使用的 OR 关键词组（在 abs/ti 字段搜索）。
# 召回优先：宁可多捞，假阳性交给 GLM 评分压低。
ARXIV_QUERY_TERMS: list[str] = [
    '"vision-language navigation"',
    '"vision and language navigation"',
    '"vision-and-language navigation"',
    "VLN",
    '"aerial vision-language"',
    '"aerial navigation"',
    '"drone navigation"',
    '"UAV navigation"',
    '"UAV vision-language"',
    '"embodied navigation"',
    '"language grounded navigation"',
    '"instruction following navigation"',
    '"navigation instruction"',
    "AerialVLN",
    "CityNav",
]

# 本地二级过滤正则（对标题+摘要做大小写不敏感匹配）。
# 捕获拼写变体与缩写，作为命中判据。任一命中即纳入候选。
import re

_LOCAL_PATTERNS: list[str] = [
    r"vision[- ]?language navigation",
    r"vision[- ]?and[- ]?language navigation",
    r"\bVLN\b",
    r"aerial[- ]?(vision[- ]?language[- ]?)?navigation",
    r"(UAV|drone)[^.\n]{0,40}(navigation|instruction)",
    r"embodied navigation",
    r"language[- ]?grounded navigation",
    r"instruction[- ]?following navigation",
    r"navigation instruction",
    r"AerialVLN",
    r"CityNav",
    r"grounded navigation",
]

LOCAL_REGEX = re.compile("|".join(_LOCAL_PATTERNS), re.IGNORECASE)


def matches_local(text: str) -> list[str]:
    """返回命中的本地关键词列表（去重，保持顺序）。空列表表示未命中。"""
    hits: list[str] = []
    seen: set[str] = set()
    for m in LOCAL_REGEX.finditer(text):
        hit = m.group(0).strip()
        key = hit.lower()
        if key not in seen:
            seen.add(key)
            hits.append(hit)
    return hits


# UAV / 航拍 VLN 子方向高亮判据（用于 is_uav_vln 提示与 UI 高亮）。
UAV_REGEX = re.compile(
    r"\b(UAV|drone|aerial|quadrotor|quadcopter)\b",
    re.IGNORECASE,
)


def looks_like_uav(text: str) -> bool:
    return bool(UAV_REGEX.search(text))


def build_arxiv_query() -> str:
    """组装 arXiv API 查询串：(cat:A OR cat:B ...) AND (abs:term OR ti:term ...)。"""
    cat_clause = " OR ".join(f"cat:{c}" for c in CATEGORIES)
    term_clauses: list[str] = []
    for t in ARXIV_QUERY_TERMS:
        # 带引号的是短语，分别加 abs: 和 ti: 前缀
        term_clauses.append(f"abs:{t}")
        term_clauses.append(f"ti:{t}")
    term_clause = " OR ".join(term_clauses)
    return f"({cat_clause}) AND ({term_clause})"
