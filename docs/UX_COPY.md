# 中文界面用语

可复用文案位于 `src/ux-copy.mjs`：术语解释与参考链接、动态图表标题、A/B 结论、Profile 标签。专有马名与官方译名使用原数据，不在文案层翻译。

| 概念 | 统一用语 |
|---|---|
| Horse Profile | 马匹资料 |
| Racing Career / Career Record | 竞赛生涯 / 生涯战绩 |
| Racing History / Performance Breakdown | 出赛记录 / 竞技表现 |
| Broodmare Sire / Female Family | 母父 / 牝系 |
| Major Wins | 主要胜鞍 |
| Compare / View Horses | 比较 / 查看产驹 |
| Methodology / Sources | 统计说明 / 资料说明 |

默认内容解释“是什么、怎样读、可做什么”；影响当前数值的缺漏或小样本紧邻结果显示；计算细节默认折叠。文件名、字段和程序状态只留在开发文档。

“已确认胜马比例”始终指已确认胜马 / 全部收录产驹，不能与胜场 / 有正式名次的出赛混用。重赏马按独立马匹计，比赛列表的等级只描述该场赛事。

术语参考用于帮助理解，不声明为本站统计数据来源。真实来源仍使用原有 JBIS、netkeiba 等来源链接与更新时间。Dosage 五类与速度／耐力解释沿用历史设计；不把它写成能力预测。

验证：`node --test tests/ux-copy.test.mjs`；`node scripts/smoke_content_photo.cjs`（需本地网站与 Playwright/Chrome）。
