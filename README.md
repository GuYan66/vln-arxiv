# VLN arXiv 监测台

每日自动监测 arXiv 上**视觉语言导航（Vision-Language Navigation, VLN）**与**无人机视觉语言导航（UAV-VLN）**方向的新论文，用智谱 GLM 生成中文简洁总结与 1-10 推荐度评分，在网页仪表盘浏览、筛选、收藏。

## 架构

```
GitHub Actions（每日 cron）
  └─ Python 管线 fetcher/run_daily.py
       ├─ arxiv_source.py   按学科+关键词查 arXiv，本地二级过滤
       ├─ keywords.py        VLN / UAV-VLN 检索词配置（改这里微调召回）
       ├─ glm_summarizer.py  调智谱 GLM：中文摘要 + 推荐度（结构化 JSON）
       └─ store.py            去重（按 arxiv id）→ 只总结新论文 → 写 data/
  └─ git commit & push data/*.json
  └─ Next.js 静态导出 → 部署到 GitHub Pages
```

- **后端逻辑**在 GHA 跑的 Python 管线里，不在网站里。
- **网站**是 Next.js（`output: 'export'`）纯静态站，构建时读 `data/*.json`，部署到 Pages。筛选/排序/搜索/收藏全在客户端（收藏用 localStorage）。
- 每日只对**新增论文**调 GLM，且有 `--limit` 上限，成本可控。

## 目录

```
fetcher/        Python 数据管线（arxiv_source / glm_summarizer / store / run_daily / keywords / models）
data/           提交到仓库的论文数据（index.json + papers/papers-YYYY-MM-DD.json）
web/            Next.js 静态站（App Router + Tailwind v4）
.github/workflows/daily-fetch.yml   每日定时抓取 + 构建 + 部署
```

## 首次部署步骤

1. **建仓库并推送**：在 GitHub 建空仓库，把本目录推上去。
2. **配 Pages 源**：仓库 Settings → Pages → Source 选 **GitHub Actions**。
3. **配 Secrets**：仓库 Settings → Secrets and variables → Actions → New repository secret：
   - `ZHIPU_API_KEY` = 你的智谱 API key（在 https://open.bigmodel.cn/ 获取）。
4. **（可选）配模型名**：在同一页 Variables（不是 Secret）新建 `GLM_MODEL` = 你账号支持的模型名（默认 `glm-4.6`；如支持更新的 glm-5.x 可设对应名）。
5. **手动触发一次**：Actions → `Daily arXiv fetch & deploy` → Run workflow。完成后 Pages 上即看到站点。之后每天 UTC 00:17 自动跑。

> 若部署在 `https://<user>.github.io/<repo>/`（项目站），workflow 会自动设置 `basePath=/<repo>`，无需手改。若仓库名形如 `<user>.github.io`，basePath 自动为空。

## 本地运行

### 管线（抓取 + 总结）

```bash
pip install -r fetcher/requirements.txt

# 1) dry-run：只抓取与本地过滤，不调 GLM，看召回是否合理
python fetcher/run_daily.py --days 7 --dry-run

# 2) 小批量验证 GLM 总结（需 .env 或环境变量里有 ZHIPU_API_KEY）
cp .env.example .env  # 填入真实 key
python fetcher/run_daily.py --days 3 --limit 3

# 3) 正式运行（默认上限 30 篇/天）
python fetcher/run_daily.py --days 3
```

### 网站

```bash
cd web
npm install
npm run dev        # http://localhost:3000
# 本地构建验证（无 basePath）
NEXT_PUBLIC_BASE_PATH= npm run build
```

`npm run dev` 会读取上一级 `data/` 的 JSON；没有数据时首页显示占位提示。

## 微调检索词

研究方向相关词集中在 `fetcher/keywords.py`：

- `CATEGORIES`：arXiv 学科范围（cs.CV / cs.RO / cs.AI / cs.CL / cs.LG / cs.MA）。
- `ARXIV_QUERY_TERMS`：传给 arXiv API 的 OR 关键词。
- `_LOCAL_PATTERNS`：本地二级过滤正则，捕获拼写变体（`vision-and-language`、`VLN`、`AerialVLN` 等）。
- `UAV_REGEX`：无人机/航拍子方向判据，用于 `is_uav_vln` 高亮。

召回优先、精度交给 GLM 评分：宁可多捞（假阳性会被评低分 1-3 并可在 UI 用「最低推荐度」筛掉），不要漏。跑几天后增删术语即可。

## 推荐度评分语义

GLM 对每篇返回 1-10：核心 VLN/UAV-VLN 且有创新贡献 7-10；相关但非核心 4-6；仅顺带提及 1-3。UI 评分徽章用顺序色阶（灰→琥珀→绿→深绿），高分强标。

## 成本与限速

- arXiv API 建议每 3 秒 1 请求（`arxiv` 包已内置）。
- GLM 只对每日**新增**论文调用，默认 `--limit 30`。VLN/UAV-VLN 是小众方向，每日新增通常个位数，花费极低。

## 验证清单

- [ ] `python fetcher/run_daily.py --days 7 --dry-run` 能命中期望论文。
- [ ] `--limit 3` 跑通 GLM，`data/papers/*.json` 有 `relevance_score`。
- [ ] `cd web && npm run build` 生成 `web/out/index.html` 且无报错。
- [ ] 推送后手动触发 workflow，`data/` 被提交、Pages 站点可访问且显示当日论文。

## 故障排查

- **workflow 跑了但站点没数据**：看 Actions 日志的 `Fetch arXiv & summarize` 步骤；若 `命中候选 0 篇`，检查 `keywords.py` 与网络。若 `summarize_error` 满屏，检查 `ZHIPU_API_KEY` 与 `GLM_MODEL` 是否正确。
- **Pages 404 / 样式丢失**：通常是 basePath 不对。项目站必须是 `<user>.github.io/<repo>/`；workflow 已自动设置，若仍异常，本地 `NEXT_PUBLIC_BASE_PATH=/<repo> npm run build` 调试。
- **详情页 404**：静态站只预渲染已存在的论文 id；新论文需等下一次构建。
