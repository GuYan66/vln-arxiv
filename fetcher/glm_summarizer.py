"""调用智谱 GLM 为每篇论文生成中文摘要与推荐度评分。

端点：https://open.bigmodel.cn/api/paas/v4/chat/completions
要求返回严格 JSON。解析失败重试 1 次，仍失败则降级记录原文、score=None，不中断整批。
"""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import requests

from models import PaperRaw, PaperSummary

ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
TIMEOUT = 60
MAX_RETRIES = 1  # 首次失败后重试 1 次

_SYSTEM = (
    "你是计算机视觉与机器人方向的科研助手，服务一位研究「视觉语言导航(VLN)」和"
    "「无人机视觉语言导航(UAV-VLN)」的研究者。你的任务：阅读论文标题与摘要，"
    "输出严格 JSON，给出简洁中文总结与对该研究者的相关度评分(1-10)。"
    "评分语义：核心 VLN/UAV-VLN 且有创新贡献 7-10；相关但非核心 4-6；仅顺带提及 1-3。"
    "若论文属于无人机/航拍(aerial/drone/UAV/quadrotor)场景，is_uav_vln 置 true。"
    "只输出 JSON，不要任何额外文字、不要 markdown 代码块。"
)

_SCHEMA_HINT = """{
  "summary_cn": "2-3 句中文摘要：背景/方法/贡献",
  "highlights": ["要点1", "要点2", "要点3"],
  "relevance_score": 8,
  "relevance_reason": "一句话说明为何相关/不相关",
  "is_uav_vln": false,
  "tags": ["VLN", "transformer"]
}"""


def _build_user_prompt(paper: PaperRaw) -> str:
    return (
        f"标题：{paper.title}\n"
        f"作者：{', '.join(paper.authors[:6])}\n"
        f"主学科：{paper.primary_category}\n"
        f"摘要：\n{paper.abstract}\n\n"
        f"本地命中关键词：{', '.join(paper.matched_keywords)}\n"
        f"UAV 提示：{paper.is_uav_hint}\n\n"
        f"请按如下 JSON schema 输出（仅 JSON）：\n{_SCHEMA_HINT}"
    )


def _extract_json(text: str) -> dict[str, Any] | None:
    """从模型回复中抽取 JSON 对象。容忍前后多余文字与 ```json 代码块。"""
    if not text:
        return None
    # 去 markdown 代码块
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    # 取第一个完整 JSON 对象
    start = candidate.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(candidate)):
        if candidate[i] == "{":
            depth += 1
        elif candidate[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(candidate[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _coerce_summary(raw: dict[str, Any], model_output: str, err: str | None) -> PaperSummary:
    """把解析出的 dict 规整为 PaperSummary，容错字段类型。"""
    score = raw.get("relevance_score")
    try:
        score_int = int(score) if score is not None else None
        if score_int is not None and (score_int < 1 or score_int > 10):
            score_int = None
    except (TypeError, ValueError):
        score_int = None

    highlights = raw.get("highlights") or []
    if isinstance(highlights, str):
        highlights = [highlights]
    highlights = [str(h) for h in highlights if h][:5]

    tags = raw.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    tags = [str(t) for t in tags if t][:8]

    return PaperSummary(
        summary_cn=str(raw.get("summary_cn", "")).strip(),
        highlights=highlights,
        relevance_score=score_int,
        relevance_reason=str(raw.get("relevance_reason", "")).strip(),
        is_uav_vln=bool(raw.get("is_uav_vln", False)),
        tags=tags,
        raw_model_output=model_output,
        summarized_at=datetime.now(timezone.utc).isoformat(),
        summarize_error=err,
    )


def _call_once(paper: PaperRaw, api_key: str, model: str) -> str:
    """单次调用 GLM，返回模型原始文本。"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _build_user_prompt(paper)},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},  # 请求 JSON 模式
    }
    resp = requests.post(ENDPOINT, headers=headers, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def summarize(paper: PaperRaw, api_key: str, model: str) -> PaperSummary:
    """总结单篇论文。失败重试 1 次，仍失败则降级。"""
    last_err: str | None = None
    model_output = ""
    for attempt in range(MAX_RETRIES + 1):
        try:
            model_output = _call_once(paper, api_key, model)
            parsed = _extract_json(model_output)
            if parsed is not None:
                return _coerce_summary(parsed, model_output, None)
            last_err = "JSON 解析失败"
        except Exception as e:  # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"
            model_output = model_output or ""
        time.sleep(1.0)  # 重试前退避
    # 降级：保留原文、score=None
    return PaperSummary(
        raw_model_output=model_output,
        summarized_at=datetime.now(timezone.utc).isoformat(),
        summarize_error=last_err,
    )


def summarize_batch(papers: list[PaperRaw], api_key: str, model: str) -> list[PaperSummary]:
    """批量总结，逐篇调用（GLM 限速宽松，逐篇便于排错与成本可控）。"""
    out: list[PaperSummary] = []
    for i, p in enumerate(papers, 1):
        print(f"      [{i}/{len(papers)}] {p.arxiv_id} …", flush=True)
        out.append(summarize(p, api_key, model))
    return out
