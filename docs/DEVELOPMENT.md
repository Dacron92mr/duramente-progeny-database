# 开发与维护

## 本地运行

需要 Python 3 和 Node.js 22+。网站本身无需安装依赖或打包。

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/`。修改文件后刷新页面。不要使用 `file://`。

## 验证

```sh
node --check app.js
for file in src/*.mjs; do node --check "$file"; done
node --test tests/*.test.mjs
node scripts/verify_chart_colors.cjs
node scripts/verify_sankey.cjs
node scripts/verify_chart_design.cjs
node scripts/verify_horse_relatives.cjs
node scripts/verify_research_charts.cjs
python3 scripts/verify_chart_insights.py
python3 -m unittest discover -s scripts/tests -v
git diff --check
```

浏览器测试是唯一新增的开发依赖，生产站不加载它。用 pnpm 锁文件固定版本：

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:references
```

先保持上面的静态服务运行。已有 Chrome 可用 `CHROME_PATH` 指定路径；`TEST_BASE_URL` 可验证项目子目录；`TEST_OUTPUT_DIR` 可指定截图目录。默认生成 `test-results/`，已忽略。`test:references` 额外检查 14 个研究主题、桌面与两行移动引用、二级研究解读、显式链接用途、无重复箭头及动态资料抽屉。测试不更新 JSON。

CI 分两个 job：`checks` 执行数据、脚本和纯函数检查；`browser-regression` 在本地 HTTP 服务上运行主界面、Profile、研究和引用四处 Playwright smoke。浏览器 job 使用锁定的 Playwright 版本与 Chromium，不访问外部论文站点；失败时上传 `browser-regression-diagnostics` 截图。

## 常见改动

- **加筛选**：`src/state.mjs` 增加字段和 `FILTER_META`；HTML 添加对应 label/select；在 `filtering.mjs` 的字段映射或明确谓词中实现；`app.js` 同步控件、事件和 `horseQuery()`；补组合筛选和 URL 测试。
- **加列**：HTML 表头和 `progeny-renderer.mjs` 同时修改；详细字段标 `.detail-only`；调整 `styles/progeny.css` 宽度，并决定是否加入 `csv.mjs` 的固定 schema。不要更改所有 `table` 的全局宽度。
- **加图**：数据处理先说明来源、样本和分母；保持对应分析页定义；使用 `renderChart()` 和 `chart-colors.js`。纯计算用稳定样本测试，浏览器核对手机、主题、放大和下钻。
- **改主题**：颜色优先修改 `styles/tokens.css`。图表依赖 `chartThemeColors()` 与主题控制器，主图和放大图都需验证。所有语义色仍由 `chart-colors.js` 管理。
- **改马匹资料/译名**：遵循 [DATA_SCHEMA.md](DATA_SCHEMA.md)，先查证，再核对清单、详情、来源和统计，不直接覆盖全部 JSON。

## CSV

导出的是**全部当前筛选结果，按当前排序**，不受页码或紧凑/详细显示影响。固定列见 `src/csv.mjs::CSV_COLUMNS`，包含 ID、三种名称、基础/血统/人员资料、两个来源奖金、胜鞍、生涯与繁殖类型。UTF-8 BOM + CRLF，所有字段引号转义，公式起始字符前加单引号。原始数据不修改。

## GitHub Pages 与 PR

保留根目录静态架构和 `.nojekyll`；根目录及所有新 `src/`、`styles/` 文件必须一起发布。所有入口资源用相对路径，兼容 `/duramente-progeny-database/`。ECharts 仅首次进入分析时从 jsDelivr 加载。

在独立分支提交并创建 PR。CI 通过不等于正式站已更新；合并后还需查看 Pages 部署结果及公共网址。此次重构创建审阅 PR，不自动合并。

原有周更（netkeiba）、按月分批（JBIS 单马）、每周种牡马指数 workflow 保持原样，不为了部署 UI 触发数据抓取。

JBIS 月度队列在每月 1–10 日运行，并为失败档案保留后续批次重试；手动运行 `JBIS monthly queue` 可设置 1–32 个档案。workflow summary 会列出总数、已完成、未处理及待重试数量。不要手工删除 `failed` 条目；一次成功重试会自动将其移入 `completed_ids`。

## 故障排查

- **列表/详情加载失败**：检查 Network 中 JSON 的路径与 HTTP 状态；使用页面重试。缓存失败会释放，下次可重新请求。
- **旧样式/模块 404**：确保 `src/`、`styles/` 已部署，刷新后检查版本资源；不要只上传根目录三文件。
- **分析加载失败**：检查 ECharts CDN、`data/analytics/`；页面提供重载。列表不依赖 ECharts。
- **照片不显示**：外部 netkeiba 图片可能拒绝访问；页面保留原站链接，不伪造照片。
- **数据更新后选项数量不匹配**：运行 `python3 scripts/build_summary.py`，并执行 `scripts/tests/test_summary.py`；不要覆盖保留的 `trainers` / `owners` 历史 facets。
- **真数据冲突**：保留双方改动，逐项人工核对；禁止用 ours/theirs 整体覆盖研究数据。
- **JBIS 队列状态异常**：不要根据旧 cursor 猜测已完成档案。保留原报告，按迁移规则重新排队；失败档案会保留错误信息和尝试次数，不会覆盖已验证奖金。

研究工作区回归：`npm run test:research` 验证实际地图平移、缩放、标记点击、同步列表、产驹追溯、A/B 图形点选、筛选下钻和同母导航。完整资料专项为 `npm run test:profile`。均支持 TEST_BASE_URL、TEST_OUTPUT_DIR、CHROME_PATH。赛果更新后执行 `python3 scripts/build_racecourse_population.py`，或通过现有同步重建流程生成索引。

文案、照片与历史功能回归：`npm run test:content`；界面用语见 [UX_COPY.md](UX_COPY.md)。

发布检查：现有浏览器套件均支持 `TEST_BROWSER=webkit`（需先安装 Playwright WebKit）。`npm run test:mobile` 使用 WebKit iPhone 13 触控模拟。所有批量截图保持在被忽略的 `test-results/` 或临时目录；不要提交第三方参考画面或照片截图。

本轮信息层级与资料回归：`npm run test:post-merge`。使用现有浏览器配置环境变量；`TEST_BROWSER=webkit` 可运行 Safari 对应引擎。截图输出到 `TEST_OUTPUT_DIR`，不要整批提交临时 QA 图片。
