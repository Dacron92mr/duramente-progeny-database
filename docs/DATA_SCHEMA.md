# 数据所有权与更新

## 不能把所有 JSON 当成生成文件

| 文件 | 所有权及更新方式 |
| --- | --- |
| `data/horses.json` | 稳定收录清单 + 人工核验字段 + 允许同步的生涯资料；不是可任意重建的缓存 |
| `data/horses/<id>.json` | 同一匹马的 `horse`、`races`、`stud`、`sources`；含来源及人工补充记录 |
| `data/summary.json` | 列表数量、当前资料 facets 与保留的 curated 历史 facets；`build_summary.py` 只重建 catalogue-owned 字段 |
| `data/analytics/overview,sire_profile,crops,bms_lines,broodmare_sires,breeders,racecourses,distance_surface,dam_age.json` | `rebuild_synced_analytics.py` 从清单和比赛记录派生，保留既有扩展元数据 |
| `annual_progeny_performance.json` | 混合：比赛派生统计 + 独立权威年度奖金系列；重建明确保留旧 `earnings*` 字段 |
| `awd.json`, `chart_insights.json` | 专用 builder 重建；与生涯、比赛及场地统计核对 |
| `sire_market,leading_sire_history,leading_sire_top10,sire_category_rankings,pedigree,dosage.json` | 人工整理或专用流程维护；同步校验要求保持不变 |
| `sire_indices.json` | 独立 JBIS 种牡马汇总页同步；不是本站重新估算的 AEI/CPI |
| `methodology.json` | 口径及数据更新日；仅成功全量周更更新日期 |
| `broodmare_produce_records.json`, `broodmare_parity_*`, `analytics/parity.json` | 繁殖与胎次研究资料/审计快照；不属于普通赛果周更输出 |
| `graded_siblings.json`, `horse_photos.json`, `analytics/covering_months.json` | 对应专用 `build_*` 脚本，运行前先查看脚本输入与 `--help` |

`rebuild_synced_analytics.py` 不会重建整个 `data/`。不得删掉“未被 builder 输出”的文件。原始赛果和人工核验资料保留不变；有来源的分类修正在派生层应用。

`build_summary.py` 更新总马数、JBIS/netkeiba 身份数、年份、性别、当前所属、颜色、牧场、母父、牝系、母龄、母父系、成就和繁殖状态 facets。`trainers`、`owners` 及未知扩展字段保留原值；历史练马师/马主筛选由 `career_history.json` 在现场生成，不拿当前清单静默覆盖历史口径。

## 标识、空值与名称

- `id` 是本地稳定标识，详情路径和深链接依赖它；`netkeiba_id`、`jbis_id` 为来源标识。保留字符串及前导零。
- `name` 为原始日文名称；`name_en`、`hkjc_name_zh` 有可靠资料才填写。
- `search_aliases` 保留既有简称、简体别名等，不能作为官方译名显示。
- 列表日文为主、英文及官方香港译名为次；缺少英文或译名时省略该部分。
- `null`／缺失／空字符串不是零。奖金零表示已知零；展示空缺为 `—`，CSV 空缺为空单元格。
- 无主要胜鞍、无比赛记录、未命名、注销、退役是不同含义，不能互相推导。
- 紧凑表格奖金优先 netkeiba、缺失时回退 JBIS；排序仍使用原有 netkeiba 字段语义。CSV 分列导出两来源数值。

## 官方香港译名的扩展结构

在列表对象与详情 `horse` 中兼容以下可选字段：

```json
{
  "hkjc_name_zh": "領銜",
  "hkjc_name_source_url": null,
  "hkjc_name_source_date": null
}
```

这是结构示意，空来源不代表核验了某网页。新增或更正译名时必须查证 HKJC 官方资料；仅填写实际查阅的 URL 和日期（`YYYY-MM-DD`）。既有译名不因缺少来源元数据而被替换或删除；不要为补 schema 批量修改所有记录。新增别名写入 `search_aliases`，不要混入官方译名字段。

更新一个马匹时同时核对列表与详情；来源证据进入 `sources`。若变动影响统计或 facets，分别运行相关 builder 和核对 `summary.json`，检查 diff 后再提交。

## 登记状态问题（已确认，未自动迁移）

审计时 `sex` 独立字段有牡、牝、セン；`status` 同时存在 `現役`、`抹消`、`現役外`、`牡`、`牝`、`牡7歳` 等值。这些信息来自不同资料口径。

建议未来新增可选结构：`registration_status = { raw, normalized, source, source_url, observed_at }`。只有来源明确时填 `normalized`，例如 `active` 或 `deregistered`；其余为 `unknown`。`抹消` 仅表示相应登记注销，不自动等于全球退役；性别年龄字符串不表示现役。保留 `status` 原值及独立 `sex`，不要按年龄推断状态。

`achievement_class` 保留原库分类，快捷 G1/G1–G3 仅比较既有分类字符串。不能将 Jpn、JRA、地方和国际分级重新等同；具体赛事体系以比赛记录和来源为准。

## 原有同步安全机制

`weekly_sync.py` 在临时目录抓取、合并、重建、校验，只有指定 `--apply` 且校验成功才覆盖数据。保护马匹集合、已知奖金、完整历史及人工统计。`rebase_sync.py` 只专门处理 `STATIC_DATA_VERSION`，遇到真正数据冲突会中止。前端编辑必须保留 `index.html` 的版本赋值格式。

## 探索派生数据与指标

新增 `data/analytics/racecourse_population.json`：`horse_ids` 为各场有正式名次记录的独立产驹 ID；`starts/wins/top3` 按原有效出赛规则计数。由 `scripts/build_racecourse_population.py` 生成，接入 `rebuild_synced_analytics.py`；逐场与原 racecourses.json 对账，不替换原聚合。

Profile：原始记录全部保留，比例分母仅为 finish 是正整数的记录，胜为 1、前三为 1–3。按日期年份、明确场地和已知米数分组；未知单列。距离为 ≤1200、1201–1600、1601–2000、2001–2400、>2400m。取消、未完成和名次缺失不补零，不从赛事名推断等级晋升；原表可恢复全部记录。

工作区比例：原生涯文字中胜数大于零的已确认胜马，或原 G1/G2/G3 分类产驹，除以当前组全部产驹。战绩未解析数另报，不解释为未知记录已失败。分组使用原字段精确值，不重写历史牧场归一化统计。同龄图直接使用 crop_development 原指标，只纳入出生年加所选年龄小于快照年份的完整年龄年度。

## 退役后记录、黑体资格与场地修正

- `post_racing_careers.json`：人工核验。以本地 ID 与 netkeiba ID 双重匹配；事件保存日期、角色、`confirmed` / `announced`、摘要、当时所属及来源。不从注销推定职业，不要求存在繁殖记录。
- `black_type_siblings.json`：由 `build_black_type_siblings.py` 从带赛果链接的 JRA 平地 G1/G2/G3/L 前三名记录生成，并加入逐例核验的外部马匹。按母马 ID 关联，排除自己。并非全球完整黑体名录；原 `graded_siblings.json` 继续保留在独立折叠栏。
- `surface_classifications.json`：合成跑道证据目录。`race-surfaces.mjs` 与 `analytics_core.effective_surface` 采用同一精确场名规则；回归测试核对两种实现与目录一致。原始场地不改写，派生记录保留 `source_surface`。
- `racecourses.overseas_history`：精简的逐场投影，保留马匹 ID、日期、赛事、结果与链接，补充经核验的国家/地区及赛马场名。包含无正式名次记录；汇总比例仍只采用正式名次。首尔、约克原“其他”归类已修正为海外。

证据、影响与覆盖边界见[本轮审计](qa/post-merge/REVIEW.md)。
