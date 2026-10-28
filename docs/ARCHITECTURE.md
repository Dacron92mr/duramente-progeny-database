# 架构与边界

## 启动和目录

这是 GitHub Pages 静态网站，不需要构建步骤、后端或框架。用 HTTP 服务打开根目录；不要直接双击 HTML（ES modules 和 JSON 需要同源 HTTP）。

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.html` | 应用导航、列表、筛选、详情容器；静态数据路径及版本号 |
| `app.js` | 启动、DOM 事件、列表协调，以及现有领域分析页面与图表组装 |
| `src/state.mjs` | 状态、筛选元信息、合法页面与分析分类 |
| `src/router.mjs` | URL 读写、参数校验、分页状态 |
| `src/data.mjs` | 静态数据与旧 API 适配；请求合并、重试、缓存 |
| `src/filtering.mjs` | 纯函数搜索、组合筛选、排序、分页；导出共用同一实现 |
| `src/progeny-renderer.mjs` | 桌面表格、手机卡片、多语言马名 |
| `src/horse-drawer.mjs` | 详情生命周期、连续查看、异步响应检查及焦点恢复 |
| `src/profile-model.mjs` | Identity / Pedigree / Racing / Breeding 纯数据模型及有效名次统计 |
| `src/horse-profile.mjs` | 专用资料组件；从模型渲染，不按显示标签搬动 DOM |
| `src/racecourse-map.mjs` | 区域、缩放平移、屏幕空间聚合、同步列表与场地追溯 |
| `src/research-workbench.mjs` | 研究分组、交集、A/B 图形比较与产驹下钻 |
| `src/research-references.mjs` | 研究来源、证据类型、桌面／移动元数据与分析主题映射；不生成 HTML |
| `src/research-rendering.mjs` | 研究说明、桌面／移动引用行、二级深入阅读与可访问标签 |
| `src/detail-content.mjs` | 比赛、繁殖、来源信息的内容渲染 |
| `src/dialog.mjs` | 背景不可交互与 Tab 焦点约束 |
| `src/theme.mjs`, `src/preferences.mjs` | 主题及本地偏好，存储禁用时安全降级 |
| `src/csv.mjs` | 固定字段 UTF-8 BOM 导出与公式注入防护 |
| `src/chart-loader.mjs` | 分析页面按需加载 ECharts 5.6.0，失败可重试 |
| `chart-colors.js` | 世代、牝系、母父系、赛事等级语义色，唯一来源 |
| `chart-design.js`, `chart-analysis.js`, `chart-animation.js` | 图表排版、研究视图和动画工具；保留现有计算 |
| `horse-relatives.js` | 按稳定母马标识查找同母重赏兄弟姐妹 |
| `styles/` | 基础、领域语义、外壳、列表、Profile、分析及研究工作区样式 |
| `data/` | 人工资料、列表、详情、派生统计，具体所有权见数据文档 |
| `scripts/`, `scripts/tests/`, `tests/` | 数据管线、数据验证、纯函数测试和浏览器回归 |
| `.github/workflows/` | PR 验证及原有定时数据更新 |

## 数据流

1. `init()` 初始化偏好、事件与分析模块依赖，加载 `summary.json` 的筛选选项。
2. 读取 URL 后打开相应页面。列表读取 `horses.json`，分析按需读取各统计 JSON。
3. 搜索、字段筛选、快捷筛选共用一个 `state`。列表、上一匹／下一匹和导出共用 `filterAndSortHorses()`。
4. 列表仅渲染当前页；桌面和手机有不同展示，但使用同一批记录。
5. 点击马名按 `id` 获取 `data/horses/<id>.json`；快速切换时过期详情响应不能覆盖当前马匹。
6. Promise 缓存合并同时发起的请求；失败后移出缓存，保留重试能力。分析缓存仍存储已解析数据，以兼容已有图表。

`chart-analysis.js` 通过 `configure()` 显式接收格式化、图表渲染和导航函数；不再依赖 `app.js` 中的隐式全局函数。只有原有跨脚本 API `Duramente*` 和分析跳转桥接保留在 `window`。

## URL 与偏好

URL 包含 `view`、分析子页、现有各筛选字段、`quick`、`sort`、`dir`、`limit`、`offset`、`horse`。默认值省略，未知页面/排序/快捷条件与非法分页值回退为安全默认值。保留部署路径，支持 GitHub Pages 项目子目录。

`localStorage` 保存 `duramente-theme`、`duramente-display`、`duramente-sidebar`。网址不保存外观和表格密度，避免分享链接改变接收者的偏好。禁用存储时仍可正常操作。

## 渐进边界

本次抽出了与探索体验直接相关的职责。领域分析仍在 `app.js`：其中图表定义、交叉引用及统计口径较复杂，未为缩短文件而强拆。后续可按种牡马／血统／繁殖／赛马场分别迁移，每次配套子页和图表下钻测试。不要在此过程中改变分母、排名、样本或 JRA/NAR/海外分类。

研究引用采用“数据 → 渲染 → CSS”的单向边界。链接用途在模板生成时显式写入，页面样式不依赖全局 DOM 观察或文本替换；因此动态内容不会因为初始化顺序丢失语义，也不会产生重复图标。新增研究主题只修改研究数据与渲染入口，不向 `app.js` 添加文献列表。

## 研究探索数据流

详情 JSON → `createProfileModel` → 身份／血统／竞赛／繁殖组件。Quick View 显示赛绩摘要与关系入口，Full Profile 显示完整研究资料；隐藏内容不参与键盘焦点。关系跳转复用现有筛选、URL 与 CSV；同母关系来自已核实目录或稳定母马标识，站内身份用 netkeiba ID 对齐。

研究工作区选择分组、世代、性别和最少样本，图形选择 A、选择器选择 B，再下钻到对应产驹。旧分析放入可展开补充证据，展开时重新排版；这部分不称为图表重画。

地图保留原 GeoJSON 与经纬度，在投影后按像素距离聚合。地图与列表共用选择，连接场地指标、距离证据和独立产驹。聚合点代表一组位置，不能解释为单个赛场地址。赛场产驹索引使用 `analytics_core` 的同一归一化与有效名次定义生成，并接入同步重建流程。

Profile 完整模式通过 `profile=full` 分享。工作区 A/B、地图区域与场地选择是页面临时状态；产驹筛选 URL 可分享。
