import { escapeHtml } from './format.mjs';
import { renderResearchSection } from './research-rendering.mjs';

export const labels = Object.freeze({
  career: '生涯战绩',
  history: '出赛记录',
  performance: '竞技表现',
  year: '年度表现',
  methodology: '统计说明',
  sources: '资料说明',
});

const conceptTitles = {
  dosage: '剂量理论｜DP · DI · CD',
  indices: '奖金指数｜AEI · CPI',
  awd: '平均胜距｜AWD',
  bms: '母父｜Broodmare Sire',
  family: '牝系｜Female Family',
  cross: '近交｜Cross',
  nicking: '配合相性｜Nicking',
};

export const concepts = Object.freeze(
  Object.fromEntries(
    Object.entries(conceptTitles).map(([id, title]) => [
      id,
      Object.freeze({ title }),
    ]),
  ),
);

export function conceptIntro(topicId, { heading = true } = {}) {
  const concept = concepts[topicId];
  if (!concept) {
    throw new Error(`Unknown research concept: ${topicId}`);
  }

  const title = heading
    ? `<h3>${escapeHtml(concept.title)}</h3>`
    : '';

  return `
    <div class="concept-intro">
      ${title}
      ${renderResearchSection(topicId)}
    </div>
  `;
}

export const dosageCategories =
  '<p class="dosage-categories">从速度到耐力：B · Brilliant（速度型） → I · Intermediate（中间型） → C · Classic（经典型） → S · Solid（耐力型） → P · Professional（长途型）。</p>';

export function metricLabel(metric, { incomplete = false } = {}) {
  if (metric === 'graded') return '重赏马比例';
  if (metric === 'wins') return '每100匹累计胜场';
  return incomplete ? '已确认胜马比例' : '胜马率';
}

export function studyTitle(field, metric, options) {
  const groupLabels = {
    broodmare_sire: '母父',
    bms_line: '母父系',
    female_family: '牝系',
    breeder: '生产牧场',
    dam_age_bucket: '母龄组',
  };
  return `不同${groupLabels[field] || '群体'}的${metricLabel(metric, options)}`;
}

function displayOneDecimal(value) {
  return Number(value.toFixed(1)).toString();
}

export function comparisonText(
  groupA,
  groupB,
  { metric = 'winners', incomplete = false } = {},
) {
  if (!groupA || !groupB || !groupA.n || !groupB.n) {
    return '当前资料不足以比较，请调整筛选条件。';
  }
  if (groupA.key === groupB.key) {
    return '当前选择了同一组产驹，请选择另一组进行比较。';
  }
  if (!Number.isFinite(groupA.value) || !Number.isFinite(groupB.value)) {
    return '部分比较资料尚未收录，暂时无法计算差异。';
  }

  const label = metricLabel(metric, { incomplete });
  const unit = metric === 'wins' ? '胜' : '个百分点';
  const difference = groupA.value - groupB.value;
  const leader = difference > 0 ? groupA.key : groupB.key;
  const summary =
    Math.abs(difference) < 0.05
      ? `${groupA.key}与${groupB.key}的${label}相同（按显示精度）。`
      : `${leader}的${label}高出 ${displayOneDecimal(Math.abs(difference))} ${unit}。`;
  const sampleWarning =
    Math.min(groupA.n, groupB.n) < 5
      ? '其中一组产驹较少，结果仅供参考。'
      : '';

  return `${summary}两组分别收录 ${groupA.n} 匹与 ${groupB.n} 匹产驹。${sampleWarning}`;
}
