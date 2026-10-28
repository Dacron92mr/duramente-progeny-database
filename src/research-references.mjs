/**
 * Editorial research metadata only.
 *
 * Keep this module independent from HTML rendering, link behavior, and
 * statistical calculations. New sources should be added here with both full
 * publication metadata and compact mobile citation text.
 */

export const evidenceTypes = Object.freeze({
  peerReviewed: '同行评审研究',
  official: '官方说明',
  industryMethod: '行业方法',
  industryReport: '行业研究报道',
});

function createReference({
  id,
  authors,
  year,
  title,
  publisher,
  url,
  doi = null,
  type,
  summary,
  limitations,
  mobile,
}) {
  if (!mobile?.authors || !mobile?.title || !mobile?.publisher) {
    throw new Error(`Reference ${id} is missing compact mobile metadata`);
  }

  return Object.freeze({
    id,
    authors,
    year,
    title,
    publisher,
    url,
    doi,
    type,
    summary,
    limitations,
    mobile: Object.freeze({ ...mobile }),
    verifiedAt: '2026-10-28',
  });
}

const sourceList = [
  createReference({
    id: 'truenicks',
    authors: 'TrueNicks',
    year: null,
    title: 'Frequently Asked Questions',
    publisher: 'TrueNicks',
    url: 'https://www.truenicks.com/faq',
    type: evidenceTypes.industryMethod,
    summary:
      '介绍如何比较种牡马与特定母父组合相对于其他配合的 stakes 胜马表现。',
    limitations:
      '专有评分方法，不等于本站的胜马率、重赏马比例或 A/B 比较。',
    mobile: {
      authors: 'TrueNicks',
      title: '配合相性方法',
      publisher: 'TrueNicks',
    },
  }),
  createReference({
    id: 'dosage',
    authors: 'BRISnet',
    year: null,
    title: 'Explanation of Dosage',
    publisher: 'Bloodstock Research Information Services',
    url: 'https://www.brisnet.com/cgi-bin/static.cgi?page=expdosage',
    type: evidenceTypes.industryMethod,
    summary:
      'DP 按 Brilliant、Intermediate、Classic、Solid、Professional 五类汇总指定祖先。前四代依次赋予 16、8、4、2 点；跨两类祖先分摊点数。DI 比较速度端与耐力端，CD 表示加权重心。',
    limitations:
      '这是传统血统模型，依赖祖先名单与分类，不是基因检测，也不能单独预测能力。页面祖先名单数量为历史版本。',
    mobile: {
      authors: 'BRISnet',
      title: 'Dosage 权重与解析',
      publisher: 'BRISnet',
    },
  }),
  createReference({
    id: 'ishige2026',
    authors: 'Taichiro Ishige et al.',
    year: 2026,
    title:
      'Genetic diversity and genomic inbreeding trends in the Japanese Thoroughbred population',
    publisher: 'Journal of Equine Science',
    url: 'https://www.jstage.jst.go.jp/article/jes/37/3/37_2607/_article/-char/ja',
    doi: '10.1294/jes.37.77',
    type: evidenceTypes.peerReviewed,
    summary:
      '比较日本不同出生年的 SNP 与连续纯合片段（ROH），观察到遗传多样性略降、基因组近交上升。',
    limitations:
      '研究对象是群体遗传结构；不能用某个五代 Cross 推算单马的 ROH 或赛绩。',
    mobile: {
      authors: 'Ishige et al.',
      title: '日本纯血马遗传多样性',
      publisher: 'J. Equine Sci.',
    },
  }),
  createReference({
    id: 'hill2022',
    authors: 'Emmeline W. Hill et al.',
    year: 2022,
    title:
      'Inbreeding depression and the probability of racing in the Thoroughbred horse',
    publisher: 'Proceedings of the Royal Society B',
    url: 'https://www.pure.ed.ac.uk/ws/files/285856215/rspb.2022.0487.pdf',
    doi: '10.1098/rspb.2022.0487',
    type: evidenceTypes.peerReviewed,
    summary:
      '研究发现基因组近交、尤其较长 ROH，与较低的出赛概率有关。',
    limitations:
      '主要结局是是否出赛，不是某个祖先的重复能否提高胜率。研究群体不能直接替代本站产驹。',
    mobile: {
      authors: 'Hill et al.',
      title: '近交与出赛概率',
      publisher: 'Proc. Royal Soc. B',
    },
  }),
  createReference({
    id: 'todd2018',
    authors: 'Evelyn T. Todd et al.',
    year: 2018,
    title:
      'Founder-specific inbreeding depression affects racing performance in Thoroughbred horses',
    publisher: 'Scientific Reports',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5906619/',
    doi: '10.1038/s41598-018-24663-x',
    type: evidenceTypes.peerReviewed,
    summary:
      '澳洲纯血马的血统分析显示，不同奠基祖先相关的近交效应并不一致；较小基因组子样本未检出整体关联。',
    limitations:
      '血统近交系数、SNP 与 ROH 不是同一指标；小样本及未控制的训练等环境因素限制解释。',
    mobile: {
      authors: 'Todd et al.',
      title: '奠基祖先近交效应',
      publisher: 'Sci. Rep.',
    },
  }),
  createReference({
    id: 'hill2002',
    authors: 'E. W. Hill et al.',
    year: 2002,
    title:
      'History and integrity of thoroughbred dam lines revealed in equine mtDNA variation',
    publisher: 'Animal Genetics',
    url: 'https://www.tbheritage.com/GeneticMarkers/HillAnimalGenetics.pdf',
    doi: '10.1046/j.1365-2052.2002.00870.x',
    type: evidenceTypes.peerReviewed,
    summary:
      '以线粒体 DNA 核对传统母系，发现部分血统记录与母系遗传关系不一致。',
    limitations:
      '牝系编号用于追溯母系历史，并非遗传能力评分；本研究没有核验本站各匹马的 DNA。',
    mobile: {
      authors: 'Hill et al.',
      title: '牝系与线粒体 DNA',
      publisher: 'Animal Genetics',
    },
  }),
  createReference({
    id: 'inoue2022',
    authors: 'Sota Inoue',
    year: 2022,
    title:
      'Influence of broodmare aging on its offspring’s racing performance',
    publisher: 'PLOS ONE',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0271535',
    doi: '10.1371/journal.pone.0271535',
    type: evidenceTypes.peerReviewed,
    summary:
      '日本赛马样本中，控制种牡马质量及其他因素后，母龄与子代赛绩的关系减弱或有限；配种选择有助于解释表面差异。',
    limitations:
      '观察性研究，不能据此断言母龄没有影响，也不能把分组胜率解释为遗传因果。',
    mobile: {
      authors: 'Inoue',
      title: '母龄与子代赛绩',
      publisher: 'PLOS ONE',
    },
  }),
  createReference({
    id: 'sharman2022',
    authors: 'Patrick Sharman, Andrew J. Young & Alastair J. Wilson',
    year: 2022,
    title:
      'Evidence of maternal and paternal age effects on speed in thoroughbred racehorses',
    publisher: 'Royal Society Open Science',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9532991/',
    doi: '10.1098/rsos.220691',
    type: evidenceTypes.peerReviewed,
    summary:
      '英国赛马记录的同一亲本内比较显示，父龄、母龄增加均与子代速度下降有关。',
    limitations:
      '研究地区、结局和模型不同于日本奖金研究；不支持给所有母马规定统一的最佳生产年龄。',
    mobile: {
      authors: 'Sharman et al.',
      title: '亲本年龄与速度',
      publisher: 'Royal Soc. Open Sci.',
    },
  }),
  createReference({
    id: 'jairs2017',
    authors: 'Julie Witt · JAIRS 译',
    year: 2017,
    title:
      '繁殖牝馬の将来の成功を左右する出生順についての研究（アメリカ）',
    publisher: 'JAIRS / The Blood-Horse',
    url: 'https://www.jairs.jp/sp/contents/w_news/2017/12/6.html',
    type: evidenceTypes.industryReport,
    summary:
      '讨论雌驹自身的出生顺序与日后作为繁殖母马的子代成绩，并介绍母马质量和样本选择问题。',
    limitations:
      '行业报道，非同行评审论文；其后代繁殖表现不能直接当作本马竞技成绩的结论。',
    mobile: {
      authors: 'JAIRS',
      title: '出生顺序与繁殖表现',
      publisher: 'JAIRS',
    },
  }),
  createReference({
    id: 'fawcett2021',
    authors:
      'Jeffrey A. Fawcett, Hideki Innan, Takeru Tsuchiya & Fumio Sato',
    year: 2021,
    title:
      'Effect of advancing age on the reproductive performance of Japanese Thoroughbred broodmares',
    publisher: 'Journal of Equine Science',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34220269/',
    doi: '10.1294/jes.32.31',
    type: evidenceTypes.peerReviewed,
    summary:
      '日本配种记录显示，活产率与母龄、初次配种年龄及配种经历有关；持续留种的母马也存在选择差异。',
    limitations:
      '活产、受孕与产驹获胜是不同结局，不能用胜马率代替繁殖成功率。',
    mobile: {
      authors: 'Fawcett et al.',
      title: '母马繁殖与年龄',
      publisher: 'J. Equine Sci.',
    },
  }),
  createReference({
    id: 'onoda2014',
    authors: 'Tomoaki Onoda et al.',
    year: 2014,
    title:
      'An Approach of Estimating Individual Growth Curves for Young Thoroughbred Horses Based on Their Birthdays',
    publisher: 'Journal of Equine Science',
    url: 'https://www.jstage.jst.go.jp/article/jes/25/2/25_1402/_article/-char/en',
    doi: '10.1294/jes.25.29',
    type: evidenceTypes.peerReviewed,
    summary:
      '日本幼驹的生长曲线纳入出生日期与季节性补偿生长后，更贴近体重和体高记录。',
    limitations:
      '研究结局是生长，不是胜率；出生月份与竞赛表现的联系仍需考虑相对月龄、管理及参赛选择。',
    mobile: {
      authors: 'Onoda et al.',
      title: '出生日期与幼驹生长',
      publisher: 'J. Equine Sci.',
    },
  }),
  createReference({
    id: 'jbis-indices',
    authors: 'JBIS-Search',
    year: null,
    title: 'よくあるご質問：AEI・CPI',
    publisher: '日本軽種馬協会',
    url: 'https://search.jbis.or.jp/help/faq/',
    type: evidenceTypes.official,
    summary:
      'AEI 将每匹出赛产驹的平均奖金与同期整体平均比较。CPI 按相关同母兄弟姐妹的平均奖金衡量母群背景；JBIS 分综合、中央与地方统计。',
    limitations:
      '分子、分母和覆盖范围须一致。仅海外出赛的部分日本产马不计入 JBIS 指数，AEI/CPI 不是种牡马因果贡献。',
    mobile: {
      authors: 'JBIS',
      title: 'AEI 与 CPI 定义',
      publisher: 'JBIS',
    },
  }),
  createReference({
    id: 'hill2010',
    authors: 'Emmeline W. Hill et al.',
    year: 2010,
    title:
      'A Sequence Polymorphism in MSTN Predicts Sprinting Ability and Racing Stamina in Thoroughbred Horses',
    publisher: 'PLOS ONE',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0008645',
    doi: '10.1371/journal.pone.0008645',
    type: evidenceTypes.peerReviewed,
    summary:
      '研究发现 MSTN 变异与最佳比赛距离相关，并在其他样本中验证。',
    limitations:
      '最佳比赛距离不等于群体 AWD。本站没有基因型数据，不能从胜距反推某匹马的 MSTN 类型。',
    mobile: {
      authors: 'Hill et al.',
      title: 'MSTN 与距离能力',
      publisher: 'PLOS ONE',
    },
  }),
  createReference({
    id: 'takahashi2015',
    authors: 'Toshiyuki Takahashi',
    year: 2015,
    title:
      'The effect of age on the racing speed of Thoroughbred racehorses',
    publisher: 'Journal of Equine Science',
    url: 'https://www.jstage.jst.go.jp/article/jes/26/2/26_1506/_article/-char/en',
    doi: '10.1294/jes.26.43',
    type: evidenceTypes.peerReviewed,
    summary:
      'JRA 草地与泥地资料按年龄、月份、性别和距离比较速度，观察到早期成长阶段的变化。',
    limitations:
      '较差表现马提前退出可能影响较高年龄组的平均值；同龄比较仍不能消除参赛选择。',
    mobile: {
      authors: 'Takahashi',
      title: '年龄与比赛速度',
      publisher: 'J. Equine Sci.',
    },
  }),
  createReference({
    id: 'jra-going',
    authors: 'JRA',
    year: null,
    title: '馬場状態およびクッション値に関する情報',
    publisher: '日本中央競馬会',
    url: 'https://www.jra.go.jp/keiba/baba/kaisetsu/',
    type: evidenceTypes.official,
    summary:
      '说明马场状态、含水率及草地缓冲值的含义和测量背景。',
    limitations:
      '场地类别并不包含全部跑道条件；同为草地或泥地也不能视为完全相同的竞赛环境。',
    mobile: {
      authors: 'JRA',
      title: '马场状态与缓冲值',
      publisher: 'JRA',
    },
  }),
  createReference({
    id: 'morioka',
    authors: 'Horse Racing in Japan',
    year: null,
    title: 'Morioka Racecourse',
    publisher: 'JRA / Horse Racing in Japan',
    url: 'https://japanracing.jp/en/racing/go_racing/local_racecourses/n07.html',
    type: evidenceTypes.official,
    summary:
      '盛冈同时设有泥地和草地跑道，地方赛事的场地分析需要把这类例外单独观察。',
    limitations:
      '赛马场设施说明不是赛绩数据来源，也不证明某匹马适合该场地。',
    mobile: {
      authors: 'Japan Racing',
      title: '盛冈跑道构成',
      publisher: 'Japan Racing',
    },
  }),
  createReference({
    id: 'nist-proportions',
    authors: 'NIST / SEMATECH',
    year: null,
    title: '7.2.4.1. Confidence intervals',
    publisher: 'e-Handbook of Statistical Methods',
    url: 'https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm',
    type: evidenceTypes.official,
    summary:
      '介绍比例的 Wilson 等区间方法，以及小样本下普通正态近似的局限。',
    limitations:
      '这是统计方法参考。赛马记录并非随机独立试验，同一匹马多次出赛及选择参赛会限制推断。',
    mobile: {
      authors: 'NIST',
      title: '比例与小样本区间',
      publisher: 'NIST',
    },
  }),
];

function indexReferences(sourceRecords) {
  const indexed = new Map();
  for (const reference of sourceRecords) {
    if (indexed.has(reference.id)) {
      throw new Error(`Duplicate reference id: ${reference.id}`);
    }
    indexed.set(reference.id, reference);
  }
  return Object.freeze(Object.fromEntries(indexed));
}

export const references = indexReferences(sourceList);

function createTopic({ id, refs, context, method }) {
  for (const referenceId of refs) {
    if (!references[referenceId]) {
      throw new Error(`Unknown reference ${referenceId} in topic ${id}`);
    }
  }

  return Object.freeze({
    id,
    refs: Object.freeze([...refs]),
    context,
    method,
  });
}

function createTopics(definitions) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definitions).map(([id, definition]) => [
        id,
        createTopic({ id, ...definition }),
      ]),
    ),
  );
}

export const researchTopics = createTopics({
  nicking: {
    refs: ['truenicks', 'inoue2022'],
    context:
      '配合相性比较种牡马与特定母父或母父系组合的产驹表现。先看样本规模，再看成绩差异。',
    method:
      '本站展示描述性统计，不计算 TrueNicks 评分。母马质量、配种选择和样本组成也可能造成组间差异，不能仅凭高胜率认定遗传相性。',
  },
  dosage: {
    refs: ['dosage'],
    context:
      'DP 将血统倾向分为速度至耐力五类，DI 与 CD 概括其平衡位置。它们描述祖先构成，不是基因检测结果。',
    method:
      '传统 DI＝(B＋I＋C/2) ÷ (C/2＋S＋P)；CD＝(2B＋I−S−2P) ÷ 总点数。分母为零时不能给出有限 DI。这里只解释模型，保留本站已有来源与计算口径。',
  },
  cross: {
    refs: ['ishige2026', 'hill2022', 'todd2018'],
    context:
      '3×4 表示同一祖先出现在第三代和第四代。血统重复可以比较，但不等于已经测得的基因组近交。',
    method:
      'SNP 是 DNA 位点变异，ROH 是连续纯合片段。本站五代 Cross 不提供这两类检测，也不能证明某个重复祖先提高能力。',
  },
  family: {
    refs: ['hill2002'],
    context:
      '牝系沿母亲、外祖母这一条母系追溯，编号与字母用于区分历史家族及分支。',
    method:
      '传统编号不是遗传表现评分。线粒体 DNA 可帮助核对母系，但历史分类不等于已验证的单一遗传谱系。',
  },
  bms: {
    refs: ['truenicks', 'inoue2022'],
    context:
      '母父是母马的父亲。按母父或母父系分组，可以观察不同配合背景下的产驹表现。',
    method:
      '这些分组并未控制全部母马质量、配种决策、牧场和世代差异；本页比较不是母父遗传贡献的独立估计。',
  },
  maternalAge: {
    refs: ['inoue2022', 'sharman2022'],
    context:
      '母龄研究的结果会随地区、成绩指标和控制因素而变化。这里先观察各母龄组的实际分布。',
    method:
      '一项日本研究控制种牡马等因素后发现母龄效应减弱；英国速度研究仍观察到亲本年龄关联。本站分组不据此指定统一的最佳母龄。',
  },
  parity: {
    refs: ['jairs2017', 'fawcett2021'],
    context:
      '生产胎次描述母马实际生产顺序；登记产驹序次只反映已登记记录，两者需要分开阅读。',
    method:
      '母龄与繁殖经历相互关联。JAIRS 报道还涉及雌驹日后的繁殖表现，不能直接用来解释本马胜率；未知胎次不作推定。',
  },
  reproduction: {
    refs: ['fawcett2021'],
    context:
      '繁殖记录关注配种及生产结果，与产驹日后的竞技成绩分开观察。',
    method:
      '研究涉及活产率及留种选择。本站既有产驹目录不能作为全部配种尝试的分母，不据此新增受孕率或活产率估计。',
  },
  birthMonth: {
    refs: ['onoda2014'],
    context:
      '同一出生年的幼驹，实际月龄和经历的生长季节仍可能不同。出生月份适合与成长及参赛机会一起观察。',
    method:
      '日本研究支持将生日与季节纳入生长曲线，研究并未证明某个月出生必然更容易获胜；本站月份图展示关联，不是季节的因果效应。',
  },
  farm: {
    refs: ['nist-proportions'],
    context: '比较牧场和俱乐部时，把产驹规模与成绩比例放在一起看。',
    method:
      '小样本比例更易波动，繁殖母群、采购与送训选择也不相同。统计参考只解释比例不确定性，不证明某个牧场或俱乐部的因果优势。',
  },
  indices: {
    refs: ['jbis-indices'],
    context:
      'AEI 比较每匹出赛产驹的平均奖金，1.00 为基准。CPI 提供配种母群的成绩背景，帮助阅读 AEI。',
    method:
      'AEI＝产驹平均奖金÷同期整体平均奖金；CPI 使用 JBIS 所定义的相关同母兄弟姐妹平均奖金与同一基准比较。本站展示来源指数，不重新计算，也不把两者之比当作遗传改良的因果量。',
  },
  awd: {
    refs: ['hill2010', 'takahashi2015'],
    context:
      'AWD 是获胜比赛距离的平均值，反映胜场集中在哪些距离。',
    method:
      '本站按既有胜场口径求平均：胜场距离合计÷胜场数。年龄、场地与赛事安排影响可赢的距离；MSTN 研究提供背景，不能从本站 AWD 推定个体基因型。',
  },
  cohort: {
    refs: ['takahashi2015'],
    context:
      '同龄比较让不同世代拥有更接近的成长阶段和观察时间。',
    method:
      '保留本站既有同龄窗口与世代纳入规则。较弱马提前退出、参赛机会与赛事安排差异仍可能影响比较，不把横截面趋势当作每匹马的成长轨迹。',
  },
  racecourse: {
    refs: ['jra-going', 'morioka', 'nist-proportions'],
    context:
      '先区分中央、地方与海外，再比较场地、距离和出赛数量。相同胜率可能来自很不一样的样本。',
    method:
      'JRA 分草地与泥地，NAR 以泥地为主并单列盛冈草地，海外保留具体出赛历程。赛程、跑道和参赛选择影响观测成绩；小样本胜率不代表稳定适性。',
  },
});
