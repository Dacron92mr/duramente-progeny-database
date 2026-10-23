import { renderBreedingYears, breedingOutcome } from './life-records.mjs';
import { renderRaceHistory } from './race-history.mjs';
import {effectiveSurface} from './race-surfaces.mjs';
import { raceLabel } from './racing-ui.mjs';
import { escapeHtml, formatNumber, money, uiValue } from "./format.mjs";

export function createDetailContent({ finishBadge }) {
  function sourceSummary(source) {
    const data = source.data || {};
    const pairs = Object.entries(data)
      .filter(([key, value]) => !["raw", "source", "source_url"].includes(key) && value !== null && value !== "")
      .slice(0, 22);
    return pairs.map(([key, value]) => `
      <dt>${escapeHtml(key)}</dt>
      <dd>${escapeHtml(value)}</dd>
    `).join("");
  }

  function horseDamCell(horse) {
    const dam = escapeHtml(horse.dam);
    if (horse.dam_jbis_id) {
      return `<a href="https://www.jbis.jp/horse/${escapeHtml(horse.dam_jbis_id)}/" target="_blank" rel="noreferrer">${dam}</a>`;
    }
    if (horse.dam_netkeiba_id) {
      return `<a href="https://db.netkeiba.com/horse/${escapeHtml(horse.dam_netkeiba_id)}/" target="_blank" rel="noreferrer">${dam}</a>`;
    }
    return dam;
  }

  function overseasPrize(race) {
    if (race.prize === null || race.prize === undefined || race.prize === "") return "—";
    const currency = race.data?.currency || (race.source === "breednet" ? "AUD" : "");
    return `${currency === "AUD" ? "A$" : ""}${formatNumber(race.prize)}`;
  }

  function raceDistanceText(value, race) {
    if (effectiveSurface(race) === "合成") return `合成跑道 ${race.distance_m ? race.distance_m+"m" : ""}`;
    const text = String(value || "");
    const match = text.match(/^(芝|ダ|障)(\d+)$/);
    if (!match) return text;
    const surface = { 芝: "芝地", ダ: "泥地", 障: "障碍" }[match[1]];
    return `${surface} ${match[2]}m`;
  }

  function raceRows(races, horse) {
    return renderRaceHistory(races, {finishBadge, raceDistanceText, overseasPrize});
  }

  function detailSources(sources = []) {
    const available = sources.filter(source => /^https?:\/\//.test(source.url || ''));
    if (!available.length) return '';
    return `<details class="source-section"><summary>资料来源与采集时间</summary><ul>${available.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.source || '原始资料')}</a>${source.fetched_at ? `<span> · ${escapeHtml(String(source.fetched_at).slice(0, 10))}</span>` : ''}</li>`).join('')}</ul></details>`;
  }

  function studTitle(studProfiles) {
    if (studProfiles.some((profile) => profile.role === "stallion")) return "种牡马记录";
    return "繁殖记录";
  }

  function studLinkName(profile, horse) {
    return horse?.name || profile.name || "马";
  }

  function studbookHref(profile) {
    return /^https:\/\//.test(profile.studbook_url || "") ? profile.studbook_url : "https://www.studbook.jp/";
  }

  function profileExternalLinks(profile) {
    const raw = profile?.external_links_json;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function normalizedStudName(value) {
    return String(value || "").replace(/[\s　]/g, "").replace(/（/g, "(").replace(/）/g, ")");
  }

  function localizedRecordText(value) {
    return String(value ?? "")
      .replaceAll("供用種雄馬。", "现役供用种牡马。")
      .replaceAll("父ドゥラメンテの繁殖登録馬。", "已登记为繁殖马，父系为ドゥラメンテ。")
      .replaceAll("繁殖牝馬。2025年にエピファネイアを種付、2026年に牡馬を出産。", "繁殖母马。2025年与エピファネイア配种，2026年产下牡驹。")
      .replaceAll("産駒は血統登録申込をされていません", "该产驹尚未申请血统登记")
      .replaceAll("ASB mare produce: foal deceased after birth.", "ASB 繁殖记录：产驹出生后死亡。")
      .replaceAll("ASB mare produce: missed.", "ASB 繁殖记录：未受孕。")
      .replaceAll("ASB mare produce: parentage verified.", "ASB 繁殖记录：血统关系已核验。")
      .replaceAll("Breednet public proof; ASB mare page is the profile link.", "Breednet 公开资料；详情链接指向 ASB 繁殖母马页面。")
      .replaceAll("Breednet/Racing NSW public proof; ASB mare page is the profile link.", "Breednet／Racing NSW 公开资料；详情链接指向 ASB 繁殖母马页面。")
      .replaceAll("報告なし", "暂无报告")
      .replaceAll("生産予定", "预计生产")
      .replaceAll("種付せず", "未配种")
      .replaceAll("双子流産", "双胎流产")
      .replaceAll("流産", "流产")
      .replaceAll("死産", "死产")
      .replaceAll("生後直死", "出生后死亡")
      .replaceAll("不受胎", "未受孕")
      .replaceAll("不明", "不明")
      .replaceAll("万円", "万日元")
      .replace(/^(\d+)年目$/, "第$1年");
  }

  function coveringResult(covering, foals) {
    return breedingOutcome(covering, foals).label;
  }

  function studSection(studProfiles, horse) {
    if (!studProfiles || !studProfiles.length) return "";
    return `
      <section class="stud-section">
        <h2>${escapeHtml(studTitle(studProfiles))}</h2>
        ${studProfiles.map((profile) => `
          <div class="stud-profile">
            <div class="stud-head">
              <div class="stud-links">
                <a class="stud-chip" href="${escapeHtml(studbookHref(profile))}" target="_blank" rel="noreferrer">Studbook 血统书</a>
                ${profileExternalLinks(profile).map((link) => `
                  <a class="stud-chip aus-chip" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || "Australia")}</a>
                `).join("")}
                ${profile.own_netkeiba_url ? `<a class="stud-chip" href="${escapeHtml(profile.own_netkeiba_url)}" target="_blank" rel="noreferrer">Netkeiba Owners</a>` : ""}
              </div>
            </div>
            ${profile.note ? `<p class="muted stud-note">${escapeHtml(localizedRecordText(profile.note))}</p>` : ""}
            ${renderBreedingYears(profile)}<details class="breeding-original"><summary>原始繁殖资料与完整明细</summary>${profile.fees.length ? `
              <h3>配种费变化</h3>
              <div class="stud-table-wrap">
                <table class="stud-table">
                  <thead>
                    <tr><th>年份</th><th>服役年</th><th>配种费</th><th>配种数</th><th>登记产驹</th><th>出赛马</th><th>胜马</th><th>代表产驹</th></tr>
                  </thead>
                  <tbody>
                    ${profile.fees.map((row) => `
                      <tr>
                        <td>${escapeHtml(row.year)}</td>
                        <td>${escapeHtml(localizedRecordText(row.service_year))}</td>
                        <td>${escapeHtml(localizedRecordText(row.fee_text))}</td>
                        <td>${escapeHtml(row.bred_count)}</td>
                        <td>${escapeHtml(row.registered_count)}</td>
                        <td>${escapeHtml(row.runners_count)}</td>
                        <td>${escapeHtml(row.winners_count)}</td>
                        <td>${escapeHtml(row.representative)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}
            ${profile.stallion_stats.length ? `
              <h3>配种与生产</h3>
              <div class="stud-table-wrap">
                <table class="stud-table">
                  <thead>
                    <tr><th>年份</th><th>配种总数</th><th>纯血马</th><th>出生</th><th>国内登记</th><th>无产驹等</th><th>改配</th></tr>
                  </thead>
                  <tbody>
                    ${profile.stallion_stats.map((row) => `
                      <tr>
                        <td>${escapeHtml(row.year)}</td>
                        <td>${escapeHtml(row.bred_total)}</td>
                        <td>${escapeHtml(row.bred_thoroughbred)}</td>
                        <td>${escapeHtml(row.births)}</td>
                        <td>${escapeHtml(row.registered_total)}</td>
                        <td>${escapeHtml(row.no_foal)}</td>
                        <td>${escapeHtml(row.changed_mating)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}
            ${profile.coverings.length ? `
              <h3>配种记录</h3>
              <div class="stud-table-wrap">
                <table class="stud-table">
                  <thead><tr><th>年份</th><th>配种日期</th><th>预产日期</th><th>种牡马</th><th>结果</th><th>饲养者</th></tr></thead>
                  <tbody>
                    ${profile.coverings.map((row) => `
                      <tr>
                        <td>${escapeHtml(row.cover_year)}</td>
                        <td>${escapeHtml(row.cover_date)}</td>
                        <td>${escapeHtml(row.due_date)}</td>
                        <td>${escapeHtml(row.stallion_name)}</td>
                        <td>${escapeHtml(coveringResult(row, profile.foals))}</td>
                        <td>${escapeHtml([row.keeper_location, row.keeper_name].filter(Boolean).join(" / "))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}
            ${profile.foals.length ? `
              <h3>繁殖记录</h3>
              <div class="stud-table-wrap">
                <table class="stud-table">
                  <thead><tr><th>年份</th><th>出生日期</th><th>毛色</th><th>性别</th><th>马名</th><th>父系</th><th>备注</th></tr></thead>
                  <tbody>
                    ${profile.foals.map((row) => `
                      <tr>
                        <td>${escapeHtml(row.result_year)}</td>
                        <td>${escapeHtml(localizedRecordText(row.birth_date))}</td>
                        <td>${escapeHtml(uiValue(row.color, "color"))}</td>
                        <td>${escapeHtml(uiValue(row.sex, "sex"))}</td>
                        <td>${escapeHtml(row.foal_name)}</td>
                        <td>${escapeHtml(row.sire_name)}</td>
                        <td>${escapeHtml(localizedRecordText(row.note))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}
          </details></div>
        `).join("")}
      </section>
    `;
  }

  return { horseDamCell, raceRows, studSection, detailSources };
}
