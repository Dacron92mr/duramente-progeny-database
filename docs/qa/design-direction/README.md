# netkeiba Familiarity × macOS Refinement

## 实际参考

2026-10-14/15 通过 Codex 内置浏览器访问真实手机版网页，以 390×844 视窗检查；这是桌面浏览器的窄屏网页验证，不是实体手机或 iOS Safari 测试。截图仅用于设计研究与对照，不作为本站 UI 素材。

- [数据库首页](https://db.sp.netkeiba.com/)：[截图](reference/database-home.jpg)。搜索、对象分类与排行榜优先，信息密度高。
- [Titleholder](https://db.sp.netkeiba.com/horse/2018103559/)：[资料](reference/titleholder-profile.jpg)、[赛果](reference/titleholder-racing.jpg)。姓名／英文／性别毛色在前，所属标在练马师旁；GI/GII 紧邻赛事名，名次独立呈现。
- [Stars On Earth](https://db.sp.netkeiba.com/horse/2019104740/)：[资料](reference/stars-profile.jpg)、[血统](reference/stars-pedigree.jpg)。父、母使用不同关系色；母父从属于母系资料。
- [Liberty Island](https://db.sp.netkeiba.com/horse/2020103656/)：[资料](reference/liberty-profile.jpg)。补充核对栗東蓝色所属标签。

实际可见元素的样式：美浦 #CC1144、栗東 #155CC1；父关系 #639FDC、母关系 #D0788C；GI #3251BC、GII #C53131，所属与等级标签约 8–10px 圆角。本站保留自己的 G1/G2/G3 色值，并以浅底深字／深底浅字适配所属和关系标签。继承资料顺序和赛马语义；改进键盘、焦点、URL 恢复、宽屏分栏、紧凑分组与主题。未复制页面代码、Logo 或照片素材。

## 三阶段对照

| 内容 | PR #1 本轮前（355916d） | 本轮更新 |
| --- | --- | --- |
| 桌面列表 | [原列表](../after-1440-light.png) | [统一所属与成就标签](updated/after-1440-light.png) |
| 详情 | [原平铺字段](../detail-1440-light.png) | [有繁殖记录三栏](updated/profile-1-1440-light.png) |
| 无繁殖记录 | 原版统一窄详情 | [两栏完整资料](updated/profile-4-1440-light.png) |
| 手机深色 | [原详情](../detail-390-dark.png) | [血统分组](updated/profile-4-390-dark.png)、[赛绩段](updated/racing-4-390-dark.png) |
| 分析 | [原种牡马分析](../sire-1440-light.png) | [研究口径入口](updated/sire-1440-light.png) |

本轮前截图保留在 `docs/qa/`，本轮输出在 `updated/`，参考站截图在 `reference/`。Titleholder 2023 有马记念为 G1 赛事、名次 3；界面明确区分赛事等级与该场获胜。最高成就来自已有数据库字段，未从赛名推断。

## 验证

- Node 12 项：既有筛选、URL、CSV、数据一致性，加赛事等级边界、完整资料 URL、研究分母和两主题标签对比度。
- Python 30 项及 6 个既有图表／数据校验脚本。
- 通用浏览器 26 组：列表密度、筛选搜索、分页排序、CSV、详情焦点与历史、外部照片失败回退、所有分析子页和图表放大、明暗主题及 390/768/1280/1440px。
- 完整资料 8 组：两匹马 × 两种主题 × 1440/390px，检查三栏／两栏／单栏、无横向溢出、段落焦点、URL 重载、关闭恢复。
- 数据及统计计算未修改；无关未跟踪文件不纳入提交。

复现：启动仅服务仓库的本地服务器，运行 `npm test`、`npm run test:browser`、`npm run test:profile`。浏览器可通过 `CHROME_PATH` 指定已有 Chromium；输出目录由 `TEST_OUTPUT_DIR` 控制。照片网络成功与否不影响核心资料，截图测试对外部照片采用失败回退。
