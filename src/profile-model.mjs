import {classifiedRace} from './race-surfaces.mjs';
// Derived views never mutate source records or replace the database career summary.
export function racingBreakdown(races) {
  const valid = race => Number.isInteger(race.finish) && race.finish > 0;
  const group = key => {
    const buckets = new Map();
    for (const race of races) {
      const label = key(race); const row = buckets.get(label) || { key: label, records: [], n: 0, wins: 0, top3: 0 };
      row.records.push(race);
      if (valid(race)) { row.n++; row.wins += race.finish === 1 ? 1 : 0; row.top3 += race.finish <= 3 ? 1 : 0; }
      buckets.set(label, row);
    }
    return [...buckets.values()].map(row => ({ ...row, excluded: row.records.length-row.n, winRate: row.n ? row.wins/row.n : null, top3Rate: row.n ? row.top3/row.n : null }));
  };
  return {
    total: races.length, valid: races.filter(valid).length,
    year: group(r => /^\d{4}[/-]/.test(r.race_date || '') ? r.race_date.slice(0,4) : '未知年份').sort((a,b)=>a.key.localeCompare(b.key)),
    surface: group(r => ({芝:'草地',ダ:'泥地',障:'障碍',合成:'合成跑道'})[r.surface] || '未确认场地'),
    distance: group(r => Number.isFinite(r.distance_m) && r.distance_m > 0 ? r.distance_m <= 1200 ? '≤1200m' : r.distance_m <= 1600 ? '1201–1600m' : r.distance_m <= 2000 ? '1601–2000m' : r.distance_m <= 2400 ? '2001–2400m' : '>2400m' : '未知距离'),
    victories: races.filter(r => r.finish === 1),
  };
}
export function createProfileModel(data, siblings = [], horses = []) {
  const h = data.horse;
  const sourceRaces=data.races||[]; const normalizedRaces=sourceRaces.map(classifiedRace); const races=normalizedRaces.every((r,i)=>r===sourceRaces[i])?sourceRaces:normalizedRaces;
  const local = new Map(horses.filter(h=>h.netkeiba_id).map(h=>[String(h.netkeiba_id),h.id]));
  return {
    id: String(h.id),
    identity: { name:h.name, english:h.name_en, chinese:h.hkjc_name_zh, sex:h.sex, color:h.color, born:h.birth_date || h.birth_year, region:h.trainer_region, trainer:h.trainer, breeder:h.breeder, owner:h.owner, birthplace:h.birthplace, netkeibaId:h.netkeiba_id, jbisId:h.jbis_id },
    pedigree: { sire:h.sire || 'ドゥラメンテ', dam:{name:h.dam, birthYear:h.dam_birth_year, age:h.dam_age_at_foaling, parity:h.dam_biological_parity, registeredOrder:h.dam_registered_foal_order, netkeibaId:h.dam_netkeiba_id, jbisId:h.dam_jbis_id}, broodmareSire:{name:h.broodmare_sire,line:h.bms_line}, family:h.female_family, crosses:h.pedigree_crosses, dp:h.dosage_profile, points:h.dosage_points, di:h.dosage_index, cd:h.center_of_distribution,
      siblings:siblings.map(s=>({...s,localId:local.get(String(s.netkeiba_id)) ?? null})) },
    racing: { summary:h.career_summary, achievement:h.achievement_class, majorWin:h.major_win, records:races, breakdown:racingBreakdown(races) },
    breeding: { records:data.stud || [], role:h.breeding_role },
    sources:data.sources || [], sourceHorse:h,
  };
}
