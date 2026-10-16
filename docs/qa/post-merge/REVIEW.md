# 专业栏目恢复、退役后记录与赛事体系分析

基线：已合并 PR #1，`ab7b4d6`。本轮通过新 PR 审阅，不自动合并或更新正式站。

## 可直接看到的变化

| 原展示 | 本轮展示 | 选择理由 |
| --- | --- | --- |
| A/B 工作区占据首页，专业栏目整体折叠 | 原一级栏目直接可访问；「比较两组」按需展开 | 不使用比较工具也能阅读核心分析 |
| 大量分类圆点和置信区间线 | 分类数量及比例用横条或并列柱；样本和区间留在详情 | 条长便于比较，散点用于连续变量关系 |
| 两岁马冠军藏在曲线中 | 2022 冠军卡 + 各年排名表 | 同时突出历史成绩与其他年份完整记录 |
| 首季种牡马大图 | 2020 冠军摘要 + 紧凑前十表 | 小榜单适合直接读数 |
| 世代成就热图与赛事圆点时间轴 | G1/G2/G3 堆叠条，重赏按年/马的历史卡 | 等级颜色一致，逐场日期、马名与赛事可读 |
| 奖金分布每匹一个点 | 箱体、中位数与上须外高奖金个体 | 降低圆点密度，仍可下钻高奖金马匹 |
| 紧凑列表约 92px/行、5 行完整可见 | 70px/行、7 行完整可见 | 1440×900 实测，计算表格滚动区域裁切；筛选可见高度 32px，手机触控目标保留 |
| Profile 控件分散，滚动后标题被覆盖 | 一个固定栏整合马名、分段、前后匹及关闭 | 手机栏保持稳定高度，分段跳转留足间距 |
| 所有体系使用同类赛马场图 | JRA 草泥比较 / NAR 泥地与盛冈草地 / 海外逐马历程 / 全部按体系概览 | 按样本性质选择图形，避免国内高频出赛支配海外比较 |

### 修改前后

| 页面 | 修改前 | 修改后 |
| --- | --- | --- |
| 种牡马首页 | [Before](sire-before.png) | [After](sire-after.png) |
| 紧凑列表 | [Before](list-before.png) | [After](list-after.png) |
| Profile | [Before](profile-before.png) | [After：桌面](profile-after.png) / [手机](career-mobile-light.png) |

更多代表截图：[首季排名](first-season.png)、[重赏历史](graded.png)、[全部体系](jurisdictions.png)、[海外历程](overseas.png)、[手机草泥比较](course-mobile.png)。截图为真实浏览器；照片请求阻断以检查自然回退，不分发第三方照片或 netkeiba 参考截图。大量临时测试截图不提交。

## 退役后记录核验

记录的是指定日期的已确认经历或计划，不宣称为当前职业、所属或所在地。与繁殖记录无关。

| 马匹 | 纳入事实 | 来源与身份核验 |
| --- | --- | --- |
| Fauvisme / フォーヴィスム | 2025-08-26 首次担任川崎诱导马；报道记录秦野国际乘马俱乐部训练 | [NAR web Furlong，高橋華代子，2025-09-19](https://www.keiba.go.jp/furlong/2025/20250919_01/) |
| Arrivo / アリーヴォ | 2024-02-22 预定转为乘马、当时去向未定；另列 2025-09-28 RRC 北海道盛装舞步第19名 | [JRA 公布，经 Radio NIKKEI 报道](https://www.radionikkei.jp/keiba_article/news/post_31493.html)、[RRC 官方成绩](https://jouba.nrca.or.jp/rrc/2025/assets/result/D7_r7_hokkaido_result.pdf)：父 Duramente、母 Esmeraldina，所属モモセライディングファーム |
| Quel Bonheur / ケルボヌール | 2023-09-30 RRC 北海道障碍马术第13名，参赛名ポケットロケット | [RRC 官方成绩](https://jouba.nrca.or.jp/rrc/2023/assets/result/J11_r5_hokkaido_result.pdf)：原赛名与父母一致，所属マオイホースパーク |
| Red Fermata / レッドフェルマータ | 2024-09-22 RRC 冈山盛装舞步第12名，参赛名ソルテ | [RRC 官方成绩](https://jouba.nrca.or.jp/rrc/2024/assets/result/D6_r6_okayama_result.pdf)：原赛名与父母一致，所属ミックルファーム |
| Rouge Glacier / ルージュグレイシア | 2025-04-20 RRC 栃木障碍马术并列第26名 | [RRC 官方成绩](https://jouba.nrca.or.jp/rrc/2025/assets/result/J3_r7_tochigi_result2.pdf)：父 Duramente、母 Driven Snow，所属中島トニアシュタール |

## 同母黑体马覆盖边界

原目录有 372 个母马键，91 条外部主要胜鞍摘要，缺少逐场名次等资格证据，不能整体改名为黑体马。保留旧目录并在独立说明栏继续提供原功能。

新目录采用带来源的 JRA 平地 G1/G2/G3/L 前三成绩，按母马身份关联。新增 Rouge Glacier 的同母姐姐 **Rouge Stiria**：2023-07-23 中京记念 G3 第三名，而非重赏冠军。[JRA 赛果](https://jra.jp/datafile/seiseki/replay/2023/064.html)与 [JBIS 母系身份](https://www.jbis.or.jp/horse/0001312182/broodmare/info/)分别提供成绩与亲缘证据。[国际编目标准](https://www.tjcis.com/pdf/icsc24/FrontMaterial2024.pdf)仅作为概念参考。

尚未穷尽外部同母马或所有国家的黑体成绩；页面明确为已核实资料，不把缺失视为没有资格。

## 场地与赛事体系审计

- Daiya 有 **4 场** Pakenham Synthetic / Ballarat Synthetic 记录，原来源标为草地，含 **1 胜**。依 [Racing Australia 目录](https://racingaustralia.horse/FAQ/Track-Information.aspx)独立列为合成跑道。原始比赛 JSON 不变；Profile 分组、赛马场统计、草地平均胜距、世代表现与牧场场地分布一致修正。总出赛、胜场、奖金不变。
- 首尔与约克各一场原归“其他”，已归海外，纳入 **32 条**海外历程。国家依据 [JRA 首尔说明](https://jra.jp/news/202609/090203.html)、[JRA 约克说明](https://jra.jp/news/202508/pdf/081903.pdf)；其他场地依据 [Racing Australia](https://racingaustralia.horse/FAQ/Track-Information.aspx)、[France Galop](https://www.france-galop.com/en/hippodromelongchamp)及 [JRA 海外出马资料](https://jra.jp/JRADB/pdf/2022/1012022010108_s.pdf)。来源赛果链接逐条保留。
- JRA 草地与泥地各自满足门槛后才进入比例图；NAR 默认只画泥地，盛冈草地另列。门槛默认30，可选1/10/30/100；未达到门槛的场地仍在全部明细中显示真实比例，包括1胜/1场=100%。
- 百分比图固定0–100%，数量与比例分开。地图气泡仍表达胜场，聚合数仍表示赛马场个数。
- 保留726匹原始清单、逐马赛果、生涯资料、已有官方译名、原同母资料及照片目录。此次没有重新抓取或复制图片。

## 验证

- 31 项 Node 单元测试、32 项 Python 测试和 6 组图表/数据校验通过。
- Chromium / WebKit：原有 26 项界面回归、8 组 Profile、13 组研究交互、等级/A-B/地图回归、照片专项均通过；WebKit 另通过 390/430px 深浅主题的4组手机触控检查。
- 新增专项覆盖 390/430/768/1440px、深浅主题，反复切换全部/JRA/NAR/海外、30场门槛与低样本、5匹退役后记录、黑体来源、固定导航及合成跑道赛绩下钻。
- 照片专项确认真实外部图片成功加载、连续4次换图、Quick/Full切换零重置、来源链接打开、失败与无照片回退。公开文档截图不包含第三方照片。
- 逐项视觉检查列表、专业栏目、冠军/首季榜单、世代分布、重赏卡片、固定栏、海外历程及手机图表。页面无横向溢出；比例轴0–100%，缺少样本不伪装为零。
- WebKit 一次旧回归遇到地图加载超时；重跑完整该套后通过。WebKit 是 Safari 对应引擎兼容性检查，不等同于真机 Safari 测试。
