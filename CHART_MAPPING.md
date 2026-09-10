# Duramente 全站图表语义与 Lieflat 映射

## 数据契约

- 本轮只改视觉编码，不改任何 JSON 数据文件，也不改字段、筛选条件、排序、Top N、年份、分组、分母或统计口径。
- 位置、长度、角度仍对应原始值；气泡/圆点面积使用当前图内有效最小值—最大值归一化后再以平方根映射半径，目的是拉开视觉差异，tooltip 与标签始终显示原始数值。
- `winner_foal_rate`、`graded_foal_rate` 等比例在渲染前核验分子、分母、0–1 范围、NaN 与 Infinity；异常只报错，不截断、不钳制、不静默修正。
- 所有网格默认关闭；必要基准线为低对比度 1px 实线。图表不使用虚线、点线、条纹、渐变或阴影。
- L1–L20 来自 `templates/lupi-gallery.html`，F1–F17 来自 `templates/basics-gallery.html`，G 系来自 `templates/glance-gallery.html`。现有 Duramente 酒红、rose、plum、gold、暖灰与 cream 色板保持不变。

## 逐图映射

| 当前图（chart id） | 原图真正回答的问题 / 数据语义 | 至少三个候选 | 最终选择 | 选择理由与保持项 |
|---|---|---|---|---|
| `annualPerformance-wins` | 年份 × JRA/NAR/海外胜场构成；看年度总量和来源构成 | F7 Stacked Rungs；L9 Bubble Almanac；F5 Tick Rows | F7 Stacked Rungs | 保留全部年份、三系列和堆叠总量；梯线分段比普通堆叠柱更有编辑感。 |
| `annualPerformance-starts` | 年份内“出赛次数 vs 出赛马”的两组比较 | F6 Paired Rungs；F12 Dumbbell Queue；F5 Paired Tick Rows | F6 Paired Rungs | 两指标同单位、同年份并排比较；不引入比率或新分母。 |
| `annualPerformance-graded` | 年份 × G1/G2/G3 胜场数 | L9 Bubble Almanac；F7 Stacked Rungs；L11 Trend Lineage | L9 Bubble Almanac | X=年份、Y=级别、圆面积=原胜场数；所有格点和零值保留。 |
| `annualPerformance-earnings` | 年度奖金时间趋势 | F2 Hairline Line；F3 Hairline Area；G18 Draw-in | F2 Hairline Line | 原年份、奖金、进行中状态不变；细线和节点替代普通柱。 |
| `sireLeadingRankChart` | Leading Sire 名次随年份变化，数值越小越好 | G21 Rank Strip；L11 Trend Lineage；L2 Dot Cascade | G21 Rank Strip | 保留原分类、年份和名次；格内显示精确名次，明度只辅助顺序。 |
| `sireTop10Chart` | 指定年份与分类中的原 Top 10 排名 | F5 Tick Rows；L2 Dot Cascade；F12 Dumbbell Queue | F5 Tick Rows | Top 10、排序、指标完全不变；Duramente 仍为酒红重点，其余暖灰。 |
| `sireCropEarningsChart` | 出生世代的总奖金与每匹平均奖金，两种不同量纲 | F5 Paired Tick Rows；F6 Paired Rungs；F12 Dumbbell Queue | F5 双区 Tick Rows | 两个对齐区分别保留原值和单位，彻底移除双轴 bar+line。 |
| `sireCropWinnersChart` | 各世代胜马率排名，同时核对胜马数/产驹数 | F5 Dot Ranking；F8 Plumb Scatter；L2 Dot Cascade | F5 Dot Ranking | 横向位置=原胜马率，点面积=原胜马数，直标 `rate · winners/foals`。 |
| `sireCropGradedChart` | 各世代重赏马率排名，同时核对重赏马数/产驹数 | F5 Dot Ranking；F8 Plumb Scatter；L2 Dot Cascade | F5 Dot Ranking | 横向位置=原重赏马率，点面积=原重赏马数；五个世代全保留。 |
| `sireAchievementStepChart` | 各出生世代在产驹、出赛、胜马、2胜、3胜、重赏、G1七阶段的转化 | L13 Hourglass Stream；F1 Rung Bars；F5 Tick Rows | L13 Hourglass Stream | 每个原世代一条流线，七阶段和原范围全部同屏；宽度=该世代内比例，节点数字=原匹数。 |
| `sireAwdDumbbellChart` | 各世代 Overall/Turf/Dirt 三种 AWD 对比 | F12 Dumbbell Queue；F6 Paired Rungs；L7 Spectrum | F12 Multi-end Dumbbell | 空心端=Turf、实心端=Dirt、中点=Overall；所有世代和三值不变。 |
| `sireDevelopmentChart` | 五个出生世代从2岁到6+的累计胜场轨迹 | F2 Hairline Line；F3 Hairline Area；L11 Trend Lineage | F2 Hairline Line | 保留原五条序列、年龄点、缺失值与标准化选择；末端直接标系列。 |
| `sireMaresCoveredChart` | Duramente 与社台其他种牡马平均配种数的年度对比 | F2 Hairline Line；F12 Dumbbell Queue；G8 Rainfall | F2 Hairline Line | 两条原序列与年份不变；细线、节点和末端标注替代默认折线。 |
| `sireStudFeeChart` | Duramente 与社台平均公开配种费的年度对比 | F2 Hairline Line；F12 Dumbbell Queue；G8 Rainfall | F2 Hairline Line | 保留万日元单位、Private 排除逻辑及原年份。 |
| `gradedWinsTimelineChart` | 2020–2026 年 G1/G2/G3 年度数量、累计过程与每匹重赏马的事件跨度 | L11 Trend Lineage；L9 Bubble Almanac；L1 Launch Fan | L11 Trend Lineage + 年度汇总行 | 每匹马一条生命线；顶部恢复原完整年份范围、零胜年份、年度分级合计和累计数。 |
| `bmsCategoryScaleChart` / `bmsLineScaleChart` | 主要母父系的产驹规模排名 | F5 Tick Rows；L2 Dot Cascade；F1 Rung Bars | F5 Tick Rows | 原六大/八大分类、顺序和产驹数不变；端点保留精确匹数。 |
| `bmsSexPerformanceChart` | 同一母父系内总体、牡、牝、骟四组比例比较 | F6 Connected Dots；L4 Arc Matrix；L20 Parallel Coordinates | F6 Connected Dots | 四个原系列全部保留；横向位置=原比例，连接线只表示组内范围，tooltip 保留分子/分母。 |
| `bmsCropShareChart` | 五个出生世代 × 六大母父系的世代内构成 | L9 Bubble Almanac；F7 Stacked Rungs；L11 Trend Lineage | L9 Bubble Almanac | 原年份、母父系和每年100%分母不变；圆面积=原世代内占比。 |
| `bmsSireContributionChart` | 具体母父按总奖金的原排名范围 | F5 Tick Rows；L2 Dot Cascade；L5 Radial Convergence | F5 Tick Rows | 保留原 Top 15 和金额，不把奖金偷换为比例。 |
| `bmsSireEfficiencyChart` | 样本门槛后的具体母父胜马率排名 | F5 Endpoint Rows；F12 Dumbbell Queue；L2 Dot Cascade | F5 Endpoint Rows | 门槛、Top 15、排序、胜马率及 winners/foals 均不变。 |
| `femaleFamilyOverallChart` | 当前用户所选指标下的牝系排名 | F5 Tick Rows；L2 Dot Cascade；L12 Type Colonnade | F5 Tick Rows / Endpoint | 沿用当前 metric、最小样本门槛和 Top 18；数量/金额/比例仍按原单位显示。 |
| `femaleFamilySexChart` | 牝系 × 牡/牝/骟的比例矩阵 | L4 Arc Matrix；F6 Connected Dots；L20 Parallel Coordinates | L4 Arc Matrix | 每条弧是一条牝系，三个节点保留三个性别系列；圆面积按图内范围拉开但值不变。 |
| `nickingLineChart` | 母父系相对整体的 nicking index，1.00 为基准 | F12 Dumbbell Queue；L2 Dot Cascade；F5 Endpoint Rows | F12 Dumbbell Queue | 空心点=1.00、实心点=原 index；不把指数误写成百分比。 |
| `nickingSireChart` | 具体母父的原 Top 15 nicking index 排名 | F5 Endpoint Rows；F12 Dumbbell Queue；L2 Dot Cascade | F5 Endpoint Rows | 原门槛、Top 15、指数与1.00实线基准不变。 |
| `crossAncestorCountChart` | 五代血统中最常见 Cross 祖先的产驹规模排名 | L2 Dot Cascade；F5 Tick Rows；F13 Treemap | L2 Dot Cascade | 原 Top 15+“其他”聚合保持；点列与终点强调替代横条。 |
| `crossAncestorPerformanceChart` | 当前指标和样本门槛下的 Cross 祖先 Top 15 | F5 Endpoint Rows；F12 Dumbbell Queue；L2 Dot Cascade | F5 Endpoint Rows | metric 切换、门槛、排序、Top 15 与单位不变；比例保留分子/分母。 |
| `dosageScatterChart` | 每匹产驹的 DI×CD 关系，DP 总点数为第三维 | F8 Plumb Scatter；G15 Jitter Strip；L20 Parallel Coordinates | F8 Plumb Scatter | X、Y、每匹马和状态不变；面积按 DP 点数局部归一，核验=实心、其他=空心。 |
| `dosageProfileChart` | B/I/C/S/P 五类平均点数构成 | L3 Horizontal Lollipop；F5 Tick Rows；F1 Rung Bars | L3 Horizontal Lollipop | 五类、平均算法和数值不变；删除一叠短横线，直接显示端点与原值。 |
| `breederMainChart` | 原 Top 15 生产牧场的规模与胜马效率双编码 | G13 Custom Pie；F4 Tick Donut；L14 Hundred Field | G13 Custom Pie | 角度=原 Top 15 图内产驹占比，半径=原胜马率；没有新增 Other，也没有扩大/缩小 Top 15。 |
| `breederGradedChart` | 原 Top 12 牧场的重赏马与 G1 马数量对比 | F4 Paired Edge Bars；F5 Tick Rows；L14 Hundred Field | F4 Paired Edge Bars | 两个原计数系列和 Top 12 保留；空/实端点代替 grouped bars。 |
| `breederCropChart` | 原 Top 10 牧场 × 2018–2022 世代产驹数 | L9 Bubble Almanac；L16 Matrix Heat；F7 Stacked Rungs | L9 Bubble Almanac | 每个原格点保留；圆面积=该牧场该世代产驹数，年份明度只辅助阅读。 |
| `clubSexShareChart` | 2018–2022 俱乐部马的牡/牝/骟世代内构成 | F7 Stacked Rungs；L14 Hundred Field；L9 Bubble Almanac | F7 Stacked Rungs | 原五年、三性别与每年100%构成不变。 |
| `clubWinCompare-牡` / `clubWinCompare-牝` / `clubWinCompare-セン` | 各性别中俱乐部马 vs 全部产驹的逐世代胜马率 | F6 Paired Rungs；F12 Dumbbell Queue；L4 Arc Matrix | F6 Paired Rungs | 三张 small multiples 各自保留五世代和两组分母；没有合并性别或年份。 |
| `coverMonthChart` | 配种月份 × 性别组的当前所选 rate | L16 Matrix Heat；F10 Dot Heat；L4 Arc Matrix | L16 Matrix Heat | 1–12月、两性别组和 winner/graded 切换不变；明度按有效值域拉开，空样本不伪装成0%。 |
| `foalMonthChart` | 出生月份 × 性别组的当前所选 rate | L16 Matrix Heat；F10 Dot Heat；L4 Arc Matrix | L16 Matrix Heat | 与配种月份同构，便于并排比较；tooltip 保留 `rate · hits/total`。 |
| `damAgeHistogramChart` | 单匹产驹在母龄上的分布 | G15 Jitter Strip；F14 Histogram；L18 Beeswarm | G15 Jitter Strip | 原每个年龄及频数展开为“一点=一匹产驹”，没有重新分箱。 |
| `damAgeWinRateChart` | 原母龄组胜马率及总体平均 | F5 Endpoint Rows；F2 Dot-line；F12 Dumbbell Queue | F5 Endpoint Rows | 原母龄桶、胜马率和 winners/foals 不变；总体平均为1px实线。 |
| `damAgeGradedRateChart` | 原母龄组重赏马率 | F5 Endpoint Rows；F2 Dot-line；L2 Dot Cascade | F5 Endpoint Rows | 原母龄桶、重赏率和 graded/foals 不变。 |
| `damFoalOrderChart` | 有序胎次的胜马率走势，同时看各胎次产驹量 | F2 Dot-line Profile；F8 Plumb Scatter；F5 Dot Ranking | F2 Dot-line Profile | 细线按原胎次顺序连接，X=胜马率，点面积=产驹数；真实/登记胎次切换保留。 |
| `racecourseJapanMap` | 日本赛马场地理位置、体系、胜率与出赛量 | 现有日本点位地图；F8 地域散点；M2 World Choropleth | 保留现有地图 | 用户明确要求保留；现有坐标、JRA/NAR分类、点面积和色阶最符合地理语义。 |
| `racecourseWinsChart` | 原 Top 10 赛马场的胜场数×胜率，出赛数为样本量 | F8 Plumb Scatter；F12 Dumbbell Queue；G8 Rainfall | F8 Plumb Scatter | X=胜场、Y=胜率、面积=出赛数；Top 10 与排序来源不变。 |
| `racecourseStartsChart` | 原 Top 10 赛马场的出赛数×前三率 | F8 Plumb Scatter；F12 Dumbbell Queue；G8 Rainfall | F8 Plumb Scatter | X=出赛、Y=前三率、面积=出赛数；原十个赛马场不变。 |
| `racecourseSurfaceChart` | 同一赛马场的芝地 vs 泥地胜率 | F6 Paired Rungs；F12 Dumbbell Queue；L4 Arc Matrix | F6 Paired Rungs | 原赛马场范围和两个 surface 分母均保留；tooltip 显示 wins/starts。 |
| `racecourseDistanceChart` | 所选赛马场五个距离桶的出赛构成与前三率 | G13 Custom Pie；F4 Tick Donut；L14 Hundred Field | G13 Custom Pie | 五个原桶不变；角度=该场内出赛占比、半径=前三率，选择器与响应式逻辑保留。 |

## 兼容路径

`bmsLineChart` 与 `femaleFamilyChart` 是旧的动态容器兼容路径，若再次启用仍分别走 F5 Tick Rows / Endpoint，保持对应 metric 和筛选范围。`damAgePerformanceChart` 与 `damAgeOrderHeatChart` 的旧兼容路径分别使用 F6 Connected Dots 与 L16 Matrix Heat；当前生产页使用上表中更明确的拆分图。
