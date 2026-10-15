/** Fixed, documented export schema. Empty stays empty; zero stays zero. */
export const CSV_COLUMNS = [
  ['id','ID'], ['name','日本語馬名'], ['name_en','English name'], ['hkjc_name_zh','香港官方译名'],
  ['birth_year','出生年'], ['sex','性别'], ['color','毛色'], ['trainer_region','所属'],
  ['achievement_class','最高成就（原分类）'], ['dam','母马'], ['female_family','牝系'],
  ['broodmare_sire','母父'], ['bms_line','母父系'], ['owner','马主'], ['trainer','练马师'],
  ['breeder','生产牧场'], ['earnings_netkeiba','netkeiba 賞金（万円）'], ['earnings_jbis','JBIS 賞金（万円）'],
  ['major_win','主要胜鞍'], ['career_summary','生涯战绩'], ['breeding_role','繁殖记录类型'],
];
export function csvCell(value) {
  let text = String(value ?? '');
  // Formula sigils after whitespace/control characters can still execute in spreadsheets.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function horsesCsv(horses) {
  return '\uFEFF' + [CSV_COLUMNS.map(([, label]) => csvCell(label)).join(','),
    ...horses.map(horse => CSV_COLUMNS.map(([key]) => csvCell(horse[key])).join(','))].join('\r\n') + '\r\n';
}
export function exportHorsesCsv(horses) {
  const url = URL.createObjectURL(new Blob([horsesCsv(horses)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'duramente-filtered.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
