import { savePreference } from "./preferences.mjs";

export function createThemeController({ els, state, chartRegistry, chartThemeColors, renderRacecourseAnalysis, getDialogChart }) {
  function resolvedTheme(preference) {
    if (preference === "dark" || preference === "light") return preference;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyChartTheme(chart) {
    if (!chart || chart.isDisposed()) return;
    const { text, muted, line, surface } = chartThemeColors();
      const option = chart.getOption();
      const axisTheme = (axes = []) => axes.map(() => ({
        axisLabel: { color: muted },
        axisLine: { lineStyle: { color: line } },
        splitLine: { lineStyle: { color: line } },
        nameTextStyle: { color: muted },
      }));
      const patch = {
        geo: (option.geo || []).map(() => ({ itemStyle: { areaColor: surface, borderColor: line } })),
        textStyle: { color: text },
        legend: (option.legend || []).map(() => ({
          inactiveColor: muted,
          textStyle: { color: text },
        })),
        xAxis: axisTheme(option.xAxis),
        yAxis: axisTheme(option.yAxis),
        tooltip: (option.tooltip || []).map(() => ({
          backgroundColor: surface,
          borderColor: line,
          textStyle: { color: text },
        })),
        title: (option.title || []).map(() => ({
          textStyle: { color: text },
          subtextStyle: { color: muted },
        })),
        visualMap: (option.visualMap || []).map(() => ({ textStyle: { color: muted } })),
        dataZoom: (option.dataZoom || []).map(() => ({ textStyle: { color: muted } })),
        series: (option.series || []).map((series) => ({
          label: { color: text },
          endLabel: { color: text },
          ...(["line", "bar"].includes(series.type) && series.label?.backgroundColor ? { label: { color: text, backgroundColor: surface } } : {}),
          markLine: series.markLine ? {
            label: { color: text, backgroundColor: surface, borderColor: line, borderWidth: 1 },
          } : undefined,
          markPoint: series.markPoint ? { label: { color: text } } : undefined,
        })),
      };
      if (chart.__designMedia) {
        const merge = (base, update) => {
          if (Array.isArray(update)) return update.map((value, i) => merge(base?.[i], value));
          if (!update || typeof update !== "object") return update;
          const result = { ...base };
          for (const [key, value] of Object.entries(update)) if (value !== undefined) result[key] = merge(base?.[key], value);
          return result;
        };
        chart.setOption({ baseOption: merge(chart.__designMedia.base, patch), media: [
          { query: { maxWidth: 480 }, option: merge(chart.__designMedia.compact, patch) },
          { option: merge(chart.__designMedia.base, patch) },
        ] });
      } else chart.setOption(patch);
  }

  function refreshChartTheme() {
    for (const chart of [...chartRegistry.values(), getDialogChart()].filter(Boolean)) {
      if (chart.isDisposed() || !chart.getDom().getClientRects().length) continue;
      chart.resize();
      applyChartTheme(chart);
    }
  }

  function applyTheme(preference, { persist = true } = {}) {
    const next = ["system", "light", "dark"].includes(preference) ? preference : "system";
    document.documentElement.dataset.themePreference = next;
    document.documentElement.dataset.theme = resolvedTheme(next);
    if (persist) savePreference("duramente-theme", next);
    if (els.themeMode) els.themeMode.value = next;
    requestAnimationFrame(() => requestAnimationFrame(refreshChartTheme));

  }

  return { applyTheme, refreshChartTheme, applyChartTheme };
}
