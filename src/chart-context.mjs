/** Reading guidance only: never changes the chart's source data or calculation. */
const groups = [
  [/sireInvestigation/, 'sire_profile.json', '原有同龄累计胜场 / 该世代全部产驹 × 100；不是独立胜马率。', '仅纳入完整经历所选年龄年度的世代；点击图形或选择 A/B，再打开对应产驹。'],
  [/(pedigree|production)Investigation/, '../horses.json', '已确认胜马或重赏马 / 当前分组全部收录产驹；战绩未解析数另列。', '按所选世代、性别与最低样本量分组；点击选择 A，再与 B 对照，差异不是因果效应。'],
  [/IndexChart$/, 'sire_indices.json', 'AEI 以同期全部出赛马平均收得奖金为基准（1.00）；JBIS 中央平地赛口径。', '年度或出生世代；不与地方、海外口径直接合并。'],
  [/Leading|firstSeason/, 'leading_sire_history.json、leading_sire_top10.json、sire_category_rankings.json', '排名、奖金为原榜单值，不是比率；Top 10 只显示头部种牡马。', '所选年份与榜单分类；缺失榜单不代表零。'],
  [/MaresCovered|StudFee/, 'sire_market.json', '配种母马数或公开配种费（万日元），无比例分母。', '年度；公布费用不等于实际成交价格。'],
  [/annualPerformance/, 'annual_progeny_performance.json', '胜场、出赛次数、独立出赛马或年度奖金，依当前图例区分；计数无比例分母。', '年度及 JRA／NAR／海外，或 G1／G2／G3；不同统计单位不可相加。'],
  [/gradedWins/, 'sire_profile.json', '每点一场已登记重赏胜利；无比例分母。', '日期、马匹及原赛事级别；不表示所有参赛记录。'],
  [/SameAge|Development/, 'crops.json、../horses.json、../horses/*.json', '胜场按年龄累积；每100匹指标以对应世代全部产驹为分母。', '出生世代及所选年龄；未完成年龄阶段与完整阶段不可等同。'],
  [/Awd|DistanceDistribution/, 'awd.json、distance_surface.json', '只纳入距离已知的胜场；平均胜距按有效胜场加权。', '世代、草地／泥地；不含障碍及距离缺失胜场。'],
  [/Concentration|CropEarnings/, 'crops.json、../horses.json', '集中度以该世代总奖金为分母；分布图每点为奖金已知产驹，包含真实零值。', '出生世代；观察年限不同，极端奖金可影响均值。'],
  [/sireCrop|sireAchievement/, 'crops.json、../horses.json', '胜马率／重赏马率以各世代全部产驹为分母；AEI 另用同期平均。', '出生世代与全库；成就层级非互斥，各世代观察年限不同。'],
  [/bms|nicking/, 'bms_lines.json、broodmare_sires.json、pedigree.json', '胜马率／重赏马率以各组产驹数为分母；世代构成以该世代产驹为分母；奖金为万日元。', '六大母父系、具体母父及所选性别／世代；小样本区间较宽，不能推断因果。'],
  [/femaleFamily/, 'pedigree.json、../horses.json', '比例以对应牝系（及所选性别）产驹为分母；数量与总奖金无比例分母。', '牝系；未分类资料及展示数量限制见当前筛选。'],
  [/cross/, 'pedigree.json', '比例以各 Cross 祖先组合的产驹为分母；同一马可计入多个组合。', '主要祖先／组合；各组重叠，不能相加或解释为独立效应。'],
  [/dosage/, 'dosage.json', 'DI、CD 为血统点数公式指标；平均 DP 以有有效资料的产驹为分母。', '有效 DP／DI／CD 记录；血统结构指标不等于实测竞技能力。'],
  [/dam|FoalOrder/, 'dam_age.json、parity.json、../horses.json', '比例以对应母龄或胎次组的有效产驹为分母；未知母龄／胎次不补零。', '母龄、真实胎次或登记序次；三者不可混用，组间非随机分配。'],
  [/coverMonth|foalMonth/, 'covering_months.json、../horses.json', '以月份已知的组内产驹计算数量或比例；配种月采用已匹配 Stud Book 资料。', '月份及当前指标；缺失月份不补零，匹配覆盖可能不均。'],
  [/breeder/, 'breeders.json、../horses.json', '胜马率以各牧场产驹数为分母；重赏图统计独立重赏马；世代构成以各牧场产驹为分母。', '主要牧场与世代；展示规模限制及登记名称合并影响分组。'],
  [/club/, '../horses.json', '比例以所选俱乐部／性别／世代的收录产驹为分母；桑基连线为产驹数。', '当前马主归属的俱乐部、全库或牧场；非历史持有份额，不代表投资回报。'],
  [/racecourse/, 'racecourses.json', '胜率、连对率、前三率以有正式名次的出赛为分母；胜场平均距离仅用有效胜场。', '赛马场、场地与距离；重复出赛不是独立马匹样本。'],
];
export function chartContext(id) { return groups.find(([pattern]) => pattern.test(id))?.slice(1); }
export function addChartContext(el, id, option) {
  const card = el.closest('.chart-card');
  if (!card) return;
  const context = chartContext(id);
  if (!context) return;
  let details = card.querySelector('.chart-context');
  if (!details) { details = document.createElement('details'); details.className = 'chart-context'; card.append(details); }
  const heading = card.querySelector('h3')?.textContent || id;
  const lead = card.querySelector('.chart-card-head p')?.textContent || '';
  const axes = [option.xAxis, option.yAxis].flat().filter(Boolean).map(axis => axis.name).filter(Boolean);
  const series = (option.series || []).map(item => item.name).filter(Boolean);
  const fields = [
    ['研究问题', `${heading}：${lead}`],
    ['数据来源', `静态快照 data/analytics/${context[0]}；原始来源与更新时间见本页来源及方法说明。`],
    ['统计量与分母', `${[...new Set([...axes, ...series])].join(' · ')}。${context[1]}`],
    ['比较组与局限', context[2]],
  ];
  details.replaceChildren();
  const summary = document.createElement('summary'); summary.textContent = '研究口径与局限'; details.append(summary);
  const list = document.createElement('dl');
  for (const [label, value] of fields) { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; list.append(dt, dd); }
  details.append(list);
}
