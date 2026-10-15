# PR #1 定向 UI 修正验收

2026-10-16。范围仅为等级展示、A/B 选中状态与赛马场圆形气泡；保留现有架构、功能和数据。PR 等待人工确认，未合并 main。

## 展示修正

| 原来 | 现在 |
|---|---|
| 独立「最高成就」列/字段，再重复显示主要胜鞍等级 | 列表、Quick View、Full Profile 只在主要胜鞍后显示赛事等级 |
| record-cell 内所有 span 被设为 block，等级横向拉伸 | 仅直接文本容器使用 block，等级为紧凑 inline-flex；G1 蓝、G2 红、G3 绿 |
| 普通母父点使用相近红色，A/B 无明显对应关系 | 普通点为中性灰；A 酒红实心、B 蓝色外圈，带字母与同色比较卡片；六大母父系保留原语义色 |
| 地图混用圆形、绿色菱形、紫色聚合 | 单场与聚合均为圆形；胜场气泡使用同一色系，聚合用中性虚线圆及场数 |

赛事等级只取具体赛事标注，不使用 achievement_class 推断。两条已有摘要的通用 G 标注按本库获胜记录纠正为 Jpn：Badenweiler 的 2023 佐賀記念为 JpnIII（race ID 202355020909），Valle de la Luna 的 2022 JBCレディスクラシック为 JpnI（202235110310）。[NAR 官方佐賀記念报道](https://www.keiba.go.jp/furlong/2023/20230209_02/)亦标明 JpnIII。原始 JSON 未更改；无可靠标注的主要胜鞍保持纯文字。

气泡直径为 `sqrt(14² + (46² - 14²) × 胜场 / 全部赛马场最大胜场)`，即最小可见面积以上的面积与胜场成比例，零胜仍可见。所有筛选使用同一范围，选中只改变边框，不改变大小。聚合直径固定 38px，数字仅表示赛马场数量；点击放大并提供具体场名按钮，继续选择单场。实际统计和坐标不变。

## 真实浏览器代表截图

以下六图由 Chromium 在 GitHub Pages 子路径下生成并逐张检查。Detailed 图已横向滚动到主要胜鞍列，固定马名仍可见。A/B 图包含字母、图例、下拉菜单及对应卡片；手机地图包含聚合、不同大小气泡与东京资料卡。

- [Compact List](list-desktop.png)
- [Detailed List](list-detailed.png)
- [Quick View：390px 深色](profile-quick.png)
- [Full Profile：1440px 深色](profile-full.png)
- [A/B Comparison](pedigree-desktop.png)
- [Mobile Racecourse Map：390px 深色](map-mobile-dark.png)

为避免随站点分发第三方照片，以上 Profile 截图主动使用图片失败回退；真实照片加载和切换在独立测试中正常通过。其他宽度/主题的 QA 图片仅留临时目录，未加入仓库。

## 验证结果

- Node 27 项、Python 30 项、6 个原有图表/数据校验脚本通过；模块语法与 diff 检查通过。
- Chromium 与 WebKit 各通过：通用 26 组、Profile 8 组、研究流程 13 条，以及照片/文案专项。
- 新增专项在两种引擎各通过 390、430、768、1440px × 深浅色共 8 组；覆盖下拉选择/真实图形点选与 A/B 卡片同步、重合点保持原坐标和双字母、圆形标记、胜场大小顺序、聚合数量与逐场选择、无水平溢出。
- G1（Titleholder）、G2（Sing That Song）、G3（Arrivo）、Jpn（Badenweiler）、障碍（Dinasta）、Open（Douradores）、无主要胜鞍（Shonan Akidon）均检查 Compact、Detailed、Quick、Full 与 390/1440px；所有可见 badge 为 inline-flex，宽度小于 85px、高度小于 32px。
- 单元回归逐一核对 726 匹资料中全部现有 achievement_class 筛选结果；字段、筛选、排序能力保留。浏览器原有组合筛选、排序、CSV 和图表下钻回归通过。
- 两种引擎均成功加载真实外部照片、连续换图 4 次无相邻重复、Quick/Full 切换保持当前图且不新增图片请求。来源新窗口打开对应 netkeiba 照片列表；失败和无目录的紧凑回退通过。
- WebKit iPhone 13 触控模拟：390/430px × 深浅色共 4 组通过，包括照片、Quick/Full、地图缩放及产驹导航。
- 全部浏览器套件使用 `/duramente-progeny-database/` 子路径。相对本轮前 `fdb370d`，已跟踪 `data/` 完全无变更，726 匹、69 个官方港译、既有统计定义、Pages 路由保留。

本机 Safari 没有启用远程自动化，未更改其设置。以上 WebKit 和触控模拟不能替代实体 Safari/iPhone 验收；仍待使用者在实际设备确认。

复跑：`npm test`、`npm run test:corrections`；现有套件见 [上一轮发布检查](README.md)。用 `TEST_BROWSER=webkit` 切换浏览器引擎，`TEST_BASE_URL` 指定 Pages 子路径，`TEST_OUTPUT_DIR` 指定仓库外截图目录。
