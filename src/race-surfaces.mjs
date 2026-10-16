// Exact named tracks verified against Racing Australia; preserve the source row.
export function effectiveSurface(race) {
  return ['Pakenham Synthetic','Ballarat Synthetic'].includes(race.meeting)?'合成':race.surface;
}
export function classifiedRace(race) {
  const surface=effectiveSurface(race);
  return surface===race.surface?race:{...race,source_surface:race.surface,surface};
}
