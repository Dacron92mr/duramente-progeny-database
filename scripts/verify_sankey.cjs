// Validate flow direction and count conservation in both scope modes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const start = source.indexOf('function renderClubBreederSankey(');
const end = source.indexOf('\nfunction ', start + 1);
let scope = 'all', option;
const sandbox = {
  document: { getElementById: () => null, querySelector: selector => selector === '#clubSankeyOwner' ? {value: scope} : null },
  isClubHorse: horse => horse.club,
  normalizedOwnerName: value => value,
  COLORS: {}, CROP_COLORS: {},
  chartThemeColors: () => ({text: '#111'}),
  renderChart: (id, value) => { option = value; },
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);
const rows = [
  {club:true, owner:'Club A', breeder:'Farm A'},
  {club:true, owner:'Club A', breeder:'Farm A'},
  {club:true, owner:'Club A', breeder:'Farm B'},
  {club:true, owner:'Club B', breeder:'Farm A'},
  {club:false, owner:'Other', breeder:'Farm C'},
];
for (const [filter, total] of [['all',4], ['Club A',3]]) {
  scope = filter;
  sandbox.renderClubBreederSankey(rows);
  const series = option.series[0];
  assert.equal(series.links.reduce((sum, link) => sum + link.value, 0), total);
  assert(series.links.every(link => link.source.startsWith('farm:') && link.target.startsWith('club:')));
  assert(series.data.every(node => node.depth === (node.name.startsWith('farm:') ? 0 : 1)));
  assert.equal(series.levels[1].label.position, 'left');
  assert.equal(series.label.overflow, 'break');
}
console.log('Verified farm → club direction, aggregation, single-club filtering and inward wrapping labels.');
