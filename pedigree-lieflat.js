(function (global) {
  "use strict";

  // Geometry is transplanted from the matching cards in lieflat-charts:
  // templates/lupi-gallery.html and templates/basics-gallery.html.
  const TEMPLATE_BY_ID = Object.freeze({
    "annualPerformance-wins": "F7 · STACKED LADDER",
    "annualPerformance-starts": "F6 · PAIRED RUNGS",
    "annualPerformance-graded": "L9 · BUBBLE ALMANAC",
    "annualPerformance-earnings": "F2 · TIMELINE HAIRLINE",
    sireCropEarningsChart: "F5 · PAIRED TICK ROWS",
    sireCropWinnersChart: "F5 · DOT RANKING / COUNT + RATE",
    sireCropGradedChart: "F5 · DOT RANKING / COUNT + RATE",
    sireAchievementStepChart: "L13 · HOURGLASS STREAM",
    sireAwdDumbbellChart: "F12 · MULTI-END DUMBBELL QUEUE",
    sireDevelopmentChart: "F2 · TIMELINE HAIRLINE",
    gradedWinsTimelineChart: "L11 · TREND LINEAGE",
    sireLeadingRankChart: "G21 · RANK STRIP",
    sireTop10Chart: "F5 · TICK ROWS / ENDPOINT",
    sireMaresCoveredChart: "F2 · TIMELINE HAIRLINE",
    sireStudFeeChart: "F2 · TIMELINE HAIRLINE",
    breederMainChart: "G13 · CUSTOM PIE",
    breederGradedChart: "F4 · PAIRED EDGE BARS",
    breederCropChart: "L9 · BUBBLE ALMANAC",
    clubSexShareChart: "F7 · STACKED LADDER",
    "clubWinCompare-牡": "F6 · PAIRED RUNGS",
    "clubWinCompare-牝": "F6 · PAIRED RUNGS",
    "clubWinCompare-セン": "F6 · PAIRED RUNGS",
    coverMonthChart: "L16 · MATRIX HEAT",
    foalMonthChart: "L16 · MATRIX HEAT",
    damAgeHistogramChart: "G15 · JITTER STRIP",
    damAgePerformanceChart: "F6 · CONNECTED DOTS",
    damAgeOrderHeatChart: "L16 · MATRIX HEAT / CELLS",
    damAgeWinRateChart: "F5 · TICK ROWS / ENDPOINT",
    damAgeGradedRateChart: "F5 · TICK ROWS / ENDPOINT",
    damFoalOrderChart: "F2 · DOT-LINE PROFILE / COUNT + RATE",
    racecourseWinsChart: "F8 · PLUMB SCATTER",
    racecourseStartsChart: "F8 · PLUMB SCATTER",
    racecourseSurfaceChart: "F6 · PAIRED RUNGS",
    racecourseDistanceChart: "G13 · CUSTOM PIE",
    bmsCategoryScaleChart: "F5 · TICK ROWS / ENDPOINT",
    bmsSexPerformanceChart: "F6 · CONNECTED DOTS",
    bmsCropShareChart: "L9 · BUBBLE ALMANAC",
    bmsLineScaleChart: "F5 · TICK ROWS / ENDPOINT",
    bmsLineRelativeChart: "F12 · DUMBBELL QUEUE",
    bmsLineChart: "F5 · TICK ROWS / ENDPOINT",
    bmsSireContributionChart: "F5 · TICK ROWS",
    bmsSireEfficiencyChart: "F5 · TICK ROWS / ENDPOINT",
    femaleFamilyOverallChart: "F5 · TICK ROWS / ENDPOINT",
    femaleFamilySexChart: "L4 · ARC MATRIX",
    femaleFamilyChart: "F5 · TICK ROWS / ENDPOINT",
    nickingLineChart: "F12 · DUMBBELL QUEUE",
    nickingSireChart: "F5 · TICK ROWS / ENDPOINT",
    crossAncestorCountChart: "L2 · DOT CASCADE",
    crossAncestorPerformanceChart: "F5 · TICK ROWS / ENDPOINT",
    dosageScatterChart: "F8 · PLUMB SCATTER",
    dosageProfileChart: "L3 · HORIZONTAL LOLLIPOP",
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rnd = (i, k) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
  const scalar = (row) => {
    const value = row && typeof row === "object" && !Array.isArray(row) ? row.value : row;
    const scalarValue = Array.isArray(value) ? value[0] : value;
    return scalarValue == null ? Number.NaN : Number(scalarValue);
  };
  const objectRow = (row) => row && typeof row === "object" && !Array.isArray(row) ? row : { value: row };
  const marker = (color) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${color}"></span>`;

  function niceUnit(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const normalized = value / power;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * power;
  }

  function formattedLabel(series, row, value, fallback) {
    const formatter = series.label?.formatter;
    if (typeof formatter !== "function") return fallback(value);
    try {
      return formatter({ value, data: row, dataIndex: 0, name: "" });
    } catch (_) {
      return fallback(value);
    }
  }

  function adaptedTooltip(option, categories, fallback) {
    const original = option.tooltip?.formatter;
    return {
      ...(option.tooltip || {}),
      trigger: "item",
      axisPointer: undefined,
      formatter: (input) => {
        const params = Array.isArray(input) ? input[0] : input;
        const row = params.data;
        const index = Number(row.value?.[1] ?? params.dataIndex);
        const adapted = {
          ...params,
          value: row.originalValue,
          axisValue: categories[index],
          name: categories[index],
          data: row,
        };
        if (typeof original === "function") return original([adapted]);
        return fallback(categories[index], row.originalValue, row);
      },
    };
  }

  // F5 · Tick Rows. One row is a queue of countable ticks, with a faint full
  // track, deterministic height variation, fifth-unit dots and an exact label.
  function tickRows(option, ctx, endpoint = false) {
    const categories = [...(option.yAxis?.data || [])];
    const source = option.series?.[0] || {};
    const values = (source.data || []).map(scalar);
    const maxValue = Math.max(...values, 1);
    const compact = global.matchMedia?.("(max-width: 640px)")?.matches;
    const unit = niceUnit(maxValue / (compact ? 14 : 32));
    const axisName = String(option.xAxis?.name || "");
    const compactValueLabel = (value) => {
      if (/%|率/.test(axisName)) return `${ctx.formatNumber(value, 1)}%`;
      if (/指数/.test(axisName)) return ctx.formatNumber(value, 2);
      return ctx.formatNumber(value, value < 10 ? 2 : value < 100 ? 1 : 0);
    };
    const rows = (source.data || []).map((sourceRow, index) => {
      const row = objectRow(sourceRow);
      const value = scalar(row);
      return {
        ...row,
        value: [value, index],
        originalValue: value,
        lieflatLabel: compact
          ? compactValueLabel(value)
          : formattedLabel(source, row, value, (number) => ctx.formatNumber(number, 1)),
      };
    });
    const color = source.itemStyle?.color || option.color?.[0] || ctx.colors.duramente;
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const value = Number(api.value(0));
      const index = Number(api.value(1));
      const start = api.coord([0, index]);
      const end = api.coord([value, index]);
      const trackEnd = api.coord([maxValue, index]);
      const ink = typeof row.itemStyle?.color === "string" ? row.itemStyle.color : color;
      const count = Math.max(1, Math.ceil(value / unit));
      const children = [{
        type: "line",
        shape: { x1: start[0], y1: start[1] + 7, x2: trackEnd[0], y2: trackEnd[1] + 7 },
        style: { stroke: ctx.theme.line, lineWidth: 0.8 },
      }];
      for (let tick = 0; tick < count; tick += 1) {
        const tickValue = Math.min(value, (tick + 0.5) * unit);
        const x = api.coord([tickValue, index])[0];
        const height = 8 + rnd(tick + 1, index + 2) * 7;
        children.push({
          type: "line",
          shape: { x1: x, y1: start[1] + 7, x2: x, y2: start[1] + 7 - height },
          style: { stroke: ink, lineWidth: 1.5, opacity: 0.86 + rnd(tick + 3, index + 5) * 0.14 },
        });
        if (tick % 5 === 4) children.push({
          type: "circle",
          shape: { cx: x, cy: start[1] + 11, r: 1.1 },
          style: { fill: ctx.theme.muted },
        });
      }
      if (endpoint) children.push({
        type: "circle",
        shape: { cx: end[0], cy: start[1], r: 4.2 },
        style: { fill: ink, stroke: ctx.theme.paper, lineWidth: 1.5 },
      });
      children.push({
        type: "text",
        style: {
          x: Math.min(end[0] + (compact ? 5 : 9), params.coordSys.x + params.coordSys.width - 4),
          y: start[1] - 3,
          text: String(row.lieflatLabel),
          fill: ctx.theme.text,
          font: `800 ${compact ? 9.5 : 11}px Inter, sans-serif`,
          align: end[0] + (compact ? 42 : 72) > params.coordSys.x + params.coordSys.width ? "right" : "left",
        },
      });
      return { type: "group", children };
    };
    const longestCategory = categories.reduce((length, label) => Math.max(length, [...String(label)].length), 0);
    const compactGrid = compact ? {
      ...(option.grid || {}),
      containLabel: false,
      left: longestCategory > 12 ? 116 : longestCategory > 8 ? 104 : 72,
      right: 52,
      top: Math.min(Number(option.grid?.top || 18), 18),
      bottom: 36,
    } : option.grid;
    return {
      ...option,
      grid: compactGrid,
      tooltip: adaptedTooltip(option, categories, (name, value) => `${name}<br>${ctx.formatNumber(value, 1)}`),
      series: [{
        ...source,
        type: "custom",
        data: rows,
        encode: { x: 0, y: 1 },
        renderItem,
        label: undefined,
        itemStyle: undefined,
        markLine: source.markLine,
        animationDelay: (index) => Math.min(index * 85, 510),
        animationEasing: "quarticOut",
      }],
    };
  }

  // L2 · Dot Cascade, rotated for long pedigree labels. Countable dots replace
  // a filled bar; the final, larger dot and exact number preserve the ranking.
  function dotCascade(option, ctx) {
    const categories = [...(option.yAxis?.data || [])];
    const source = option.series?.[0] || {};
    const values = (source.data || []).map(scalar);
    const maxValue = Math.max(...values, 1);
    const unit = niceUnit(maxValue / 26);
    const rows = (source.data || []).map((sourceRow, index) => {
      const row = objectRow(sourceRow);
      const value = scalar(row);
      return {
        ...row,
        value: [value, index],
        originalValue: value,
        lieflatLabel: formattedLabel(source, row, value, (number) => ctx.formatNumber(number, 0)),
      };
    });
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const value = Number(api.value(0));
      const index = Number(api.value(1));
      const start = api.coord([0, index]);
      const end = api.coord([value, index]);
      const count = Math.max(1, Math.ceil(value / unit));
      const ink = typeof row.itemStyle?.color === "string" ? row.itemStyle.color : (option.color?.[0] || ctx.colors.duramente);
      const children = [{
        type: "line",
        shape: { x1: start[0], y1: start[1] + 8, x2: end[0], y2: end[1] + 8 },
        style: { stroke: ctx.theme.line, lineWidth: 1, opacity: 0.62 },
      }];
      for (let dot = 0; dot < count; dot += 1) {
        const dotValue = Math.min(value, (dot + 0.5) * unit);
        const x = api.coord([dotValue, index])[0];
        const isTop = dot === count - 1;
        children.push({
          type: "circle",
          shape: { cx: x, cy: start[1], r: isTop ? 4.8 : 2.5 },
          style: { fill: isTop ? ink : ctx.theme.muted, opacity: isTop ? 1 : 0.9 },
        });
      }
      children.push({
        type: "text",
        style: { x: end[0] + 9, y: start[1] - 3, text: String(row.lieflatLabel), fill: ctx.theme.text, font: "800 11px Inter, sans-serif" },
      });
      return { type: "group", children };
    };
    return {
      ...option,
      tooltip: adaptedTooltip(option, categories, (name, value) => `${name}<br>${ctx.formatNumber(value)}匹`),
      series: [{ ...source, type: "custom", data: rows, encode: { x: 0, y: 1 }, renderItem, label: undefined, itemStyle: undefined, animationDelay: (index) => index * 55, animationEasing: "quarticOut" }],
    };
  }

  // F12 · Dumbbell Queue. The existing 1.00 reference line becomes the hollow
  // endpoint; the observed index remains the solid endpoint and exact label.
  function dumbbellQueue(option, ctx) {
    const categories = [...(option.yAxis?.data || [])];
    const source = option.series?.[0] || {};
    const baseline = Number(source.markLine?.data?.[0]?.xAxis ?? option.lieflatBaseline ?? 1);
    const rows = (source.data || []).map((sourceRow, index) => {
      const row = objectRow(sourceRow);
      const value = scalar(row);
      return { ...row, value: [value, index], originalValue: value, lieflatLabel: formattedLabel(source, row, value, (number) => number.toFixed(2)) };
    });
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const value = Number(api.value(0));
      const index = Number(api.value(1));
      const a = api.coord([baseline, index]);
      const b = api.coord([value, index]);
      const ink = typeof row.itemStyle?.color === "string" ? row.itemStyle.color : ctx.colors.duramente;
      const children = [{ type: "line", shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: ink, lineWidth: 1.8 } }];
      const beads = Math.max(0, Math.floor(Math.abs(b[0] - a[0]) / 12) - 1);
      for (let bead = 1; bead <= beads; bead += 1) {
        const t = bead / (beads + 1);
        children.push({ type: "circle", shape: { cx: a[0] + (b[0] - a[0]) * t, cy: a[1], r: 1.5 }, style: { fill: ctx.theme.muted } });
      }
      children.push(
        { type: "circle", shape: { cx: a[0], cy: a[1], r: 4.3 }, style: { fill: ctx.theme.paper, stroke: ctx.colors.gold, lineWidth: 1.8 } },
        { type: "circle", shape: { cx: b[0], cy: b[1], r: 4.6 }, style: { fill: ink } },
        { type: "text", style: { x: b[0] + (value >= baseline ? 9 : -9), y: b[1] - 3, text: String(row.lieflatLabel), fill: ctx.theme.text, font: "800 11px Inter, sans-serif", align: value >= baseline ? "left" : "right" } },
      );
      return { type: "group", children };
    };
    return {
      ...option,
      tooltip: adaptedTooltip(option, categories, (name, value) => `${name}<br>${Number(value).toFixed(2)}`),
      series: [{ ...source, type: "custom", data: rows, encode: { x: 0, y: 1 }, renderItem, label: undefined, itemStyle: undefined, markLine: undefined, animationDelay: (index) => index * 75, animationEasing: "quarticOut" }],
    };
  }

  // L20 · Parallel Coordinates. One hairline is one broodmare-sire family,
  // crossing the existing overall / male / female / gelding rate dimensions.
  function parallelCoordinates(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const axisNames = sourceSeries.map((series) => series.name || "总体");
    const rows = categories.map((category, categoryIndex) => {
      const sourceItems = sourceSeries.map((series, seriesIndex) => ({
        axisValue: category,
        seriesName: series.name,
        marker: marker(option.color?.[seriesIndex] || ctx.theme.data[seriesIndex % ctx.theme.data.length]),
        value: scalar(series.data?.[categoryIndex]),
        data: objectRow(series.data?.[categoryIndex]),
      }));
      const tooltipHtml = typeof option.tooltip?.formatter === "function" ? option.tooltip.formatter(sourceItems) : category;
      return { category, value: sourceItems.map((item) => item.value), tooltipHtml };
    });
    const palette = categories.map((category) => ctx.bmsColors?.[category] || ctx.colors.duramente);
    return {
      ...option,
      tooltip: { ...(option.tooltip || {}), trigger: "item", formatter: (params) => params.data.tooltipHtml },
      legend: { show: false },
      grid: undefined,
      xAxis: undefined,
      yAxis: undefined,
      parallel: { left: 58, right: 42, top: 58, bottom: 46, parallelAxisDefault: { type: "value", min: 0, max: 100, nameLocation: "end", nameGap: 14 } },
      parallelAxis: axisNames.map((name, index) => ({ dim: index, name, min: 0, max: 100, axisLabel: { formatter: "{value}%" } })),
      series: rows.map((row, index) => ({
        name: row.category,
        type: "parallel",
        data: [{ value: row.value, tooltipHtml: row.tooltipHtml, category: row.category }],
        lineStyle: { color: palette[index], width: index === 0 ? 2.6 : 1.8, opacity: 0.86 },
        emphasis: { lineStyle: { width: 4, opacity: 1 } },
        animationDelay: index * 70,
        animationEasing: "quarticOut",
      })),
    };
  }

  // L4 · Arc Matrix. Every family is a bowed horizon; bubble area carries the
  // existing sex-specific rate, while the original three category colors stay.
  function arcMatrix(option, ctx) {
    const families = [...(option.yAxis?.data || [])];
    const sourceSeries = option.series || [];
    const sexes = sourceSeries.map((series) => series.name);
    const colors = sourceSeries.map((_, index) => option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    const positiveRates = sourceSeries.flatMap((series) => (series.data || []).map(scalar)).filter((value) => Number.isFinite(value) && value > 0);
    const minRate = positiveRates.length ? Math.min(...positiveRates) : 0;
    const maxRate = Math.max(...positiveRates, 1);
    const rows = families.map((family, familyIndex) => {
      const values = sourceSeries.map((series) => scalar(series.data?.[familyIndex]));
      const sourceItems = sourceSeries.map((series, seriesIndex) => ({
        axisValue: family,
        seriesName: series.name,
        marker: marker(colors[seriesIndex]),
        value: values[seriesIndex],
        data: objectRow(series.data?.[familyIndex]),
      }));
      const tooltipHtml = typeof option.tooltip?.formatter === "function" ? option.tooltip.formatter(sourceItems) : family;
      return { value: [familyIndex, ...values], family, tooltipHtml };
    });
    const renderItem = (params, api) => {
      const familyIndex = Number(api.value(0));
      const points = sexes.map((_, index) => {
        const point = api.coord([index, familyIndex]);
        return [point[0], point[1] - Math.sin(Math.PI * index / Math.max(1, sexes.length - 1)) * 8];
      });
      const children = [{ type: "polyline", shape: { points, smooth: 0.45 }, style: { stroke: ctx.theme.line, lineWidth: 1.2, fill: null } }];
      points.forEach((point, index) => {
        const value = Number(api.value(index + 1)) || 0;
        const normalized = maxRate === minRate ? 0.55 : (value - minRate) / (maxRate - minRate);
        children.push({
          type: "circle",
          shape: { cx: point[0], cy: point[1], r: value ? 2.4 + Math.pow(clamp(normalized, 0, 1), 0.62) * 8.6 : 1.2 },
          style: { fill: value ? colors[index] : ctx.theme.line, stroke: ctx.theme.paper, lineWidth: value ? 1.2 : 0 },
        });
      });
      return { type: "group", children };
    };
    return {
      ...option,
      tooltip: { ...(option.tooltip || {}), trigger: "item", formatter: (params) => params.data.tooltipHtml },
      legend: { show: false },
      grid: { ...(option.grid || {}), top: 42, bottom: 48 },
      xAxis: { type: "category", data: sexes, position: "top", axisTick: { show: false } },
      yAxis: { ...option.yAxis, data: families },
      series: [{ type: "custom", name: "按性别表现", data: rows, encode: { y: 0 }, renderItem, animationDelay: (index) => index * 45, animationEasing: "quarticOut" }],
    };
  }

  // L9 · Bubble Almanac. The year × lineage matrix stays intact; bubble area is
  // the existing within-year share and a small core makes every record tangible.
  function bubbleAlmanac(option, ctx) {
    const years = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const lineages = sourceSeries.map((series) => series.name);
    const colors = sourceSeries.map((series, index) => series.itemStyle?.color || option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    const points = [];
    years.forEach((year, yearIndex) => {
      sourceSeries.forEach((series, lineageIndex) => {
        const row = objectRow(series.data?.[yearIndex]);
        const share = scalar(row);
        const sourceItems = sourceSeries.map((item, itemIndex) => {
          const itemRow = objectRow(item.data?.[yearIndex]);
          return {
            axisValue: year,
            seriesName: item.name,
            marker: marker(colors[itemIndex]),
            value: scalar(itemRow),
            data: itemRow,
          };
        });
        const tooltipHtml = typeof option.tooltip?.formatter === "function" ? option.tooltip.formatter(sourceItems) : `${year} · ${series.name} · ${share}%`;
        points.push({ value: [yearIndex, lineageIndex, share], year, lineage: series.name, count: row.count, raw: row.raw, color: colors[lineageIndex], tooltipHtml });
      });
    });
    points.sort((a, b) => b.value[2] - a.value[2]);
    const positiveValues = points.map((row) => Number(row.value[2])).filter((value) => value > 0);
    const minPositive = positiveValues.length ? Math.min(...positiveValues) : 0;
    const maxPositive = Math.max(...positiveValues, 1);
    const renderItem = (params, api) => {
      const point = points[params.dataIndex];
      const xIndex = Number(api.value(0));
      const yIndex = Number(api.value(1));
      const value = Number(api.value(2)) || 0;
      const center = api.coord([xIndex, yIndex]);
      const normalized = maxPositive === minPositive ? 0.55 : (value - minPositive) / (maxPositive - minPositive);
      const radius = value ? 2.6 + Math.pow(clamp(normalized, 0, 1), 0.62) * 13.4 : 1.2;
      const polygon = [];
      for (let step = 0; step < 18; step += 1) {
        const angle = step / 18 * Math.PI * 2;
        const wobble = 1 + 0.055 * Math.sin(angle * 2 + params.dataIndex) + (rnd(params.dataIndex + step, 3) - 0.5) * 0.05;
        polygon.push([center[0] + Math.cos(angle) * radius * wobble, center[1] + Math.sin(angle) * radius * wobble]);
      }
      return {
        type: "group",
        children: value ? [
          { type: "polygon", shape: { points: polygon }, style: { fill: point.color, stroke: ctx.theme.paper, lineWidth: 1.2, opacity: 0.9 } },
          { type: "circle", shape: { cx: center[0] + radius * 0.08, cy: center[1] - radius * 0.06, r: Math.max(1.2, radius * 0.18) }, style: { fill: ctx.theme.text, opacity: 0.9 } },
        ] : [{ type: "circle", shape: { cx: center[0], cy: center[1], r: 1.2 }, style: { fill: ctx.theme.line } }],
      };
    };
    return {
      ...option,
      tooltip: { ...(option.tooltip || {}), trigger: "item", formatter: (params) => params.data.tooltipHtml },
      legend: { show: false },
      grid: { left: 118, right: 28, top: 34, bottom: 46, containLabel: false },
      xAxis: { type: "category", data: years, position: "top", axisTick: { show: false } },
      yAxis: { type: "category", data: lineages, inverse: true, axisTick: { show: false } },
      series: [{ type: "custom", name: "世代内占比", data: points, encode: { x: 0, y: 1, tooltip: 2 }, renderItem, animationDelay: (index) => Math.min(index * 18, 540), animationEasing: "quarticOut" }],
    };
  }

  // G9 · Scatter Morph, dense scatter view. This dataset contains hundreds of
  // horses, so the gallery's <=20-point Plumb Scatter would create false visual
  // density. Keep the honest DI/CD plane and transplant G9's bubble geometry,
  // clean spacing, restrained outlines and universal-transition motion language.
  function denseScatter(option, ctx) {
    const source = option.series?.[0] || {};
    return {
      ...option,
      grid: { ...(option.grid || {}), left: 50, right: 22, top: 24, bottom: 46 },
      tooltip: { ...(option.tooltip || {}), trigger: "item" },
      series: [{
        ...source,
        type: "scatter",
        universalTransition: true,
        symbol: "circle",
        label: { show: false },
        itemStyle: {
          ...(source.itemStyle || {}),
          color: ctx.colors.duramente,
          borderColor: ctx.theme.paper,
          borderWidth: 1,
        },
        emphasis: {
          ...(source.emphasis || {}),
          scale: 1.35,
          itemStyle: { borderColor: ctx.colors.gold, borderWidth: 2 },
        },
        animationDelay: (index) => Math.min(index * 3, 650),
        animationEasing: "quarticOut",
      }],
    };
  }

  // F1 · Rung Bars. The five DP averages keep their exact values and colors;
  // the filled rectangles become ladders built from proportional rungs.
  function rungBars(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const source = option.series?.[0] || {};
    const values = (source.data || []).map(scalar);
    const maxValue = Math.max(...values, 1);
    const unit = niceUnit(maxValue / 24);
    const colorFor = (index) => typeof source.itemStyle?.color === "function"
      ? source.itemStyle.color({ dataIndex: index })
      : (option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    const rows = values.map((value, index) => ({ value: [index, value], originalValue: value, color: colorFor(index), lieflatLabel: formattedLabel(source, objectRow(source.data[index]), value, (number) => ctx.formatNumber(number, 2)) }));
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const index = Number(api.value(0));
      const value = Number(api.value(1));
      const base = api.coord([index, 0]);
      const count = Math.max(1, Math.ceil(value / unit));
      const categoryWidth = Math.abs(api.size([1, 0])[0]);
      const halfWidth = clamp(categoryWidth * 0.18, 10, 20);
      const children = [];
      for (let rung = 0; rung < count; rung += 1) {
        const rungValue = Math.min(value, (rung + 0.5) * unit);
        const y = api.coord([index, rungValue])[1];
        const width = halfWidth * (0.88 + rnd(rung + 1, index + 2) * 0.12);
        children.push({ type: "line", shape: { x1: base[0] - width, y1: y, x2: base[0] + width, y2: y }, style: { stroke: row.color, lineWidth: 1.7, opacity: 0.86 + rnd(rung + 3, index + 4) * 0.14 } });
      }
      const top = api.coord([index, value]);
      children.push({ type: "text", style: { x: top[0], y: top[1] - 9, text: String(row.lieflatLabel), fill: ctx.theme.text, font: "800 11px Inter, sans-serif", align: "center" } });
      return { type: "group", children };
    };
    return {
      ...option,
      tooltip: { ...(option.tooltip || {}), trigger: "item", formatter: (params) => `${categories[params.data.value[0]]}<br>${ctx.formatNumber(params.data.originalValue, 2)}` },
      series: [{ ...source, type: "custom", data: rows, encode: { x: 0, y: 1 }, renderItem, label: undefined, itemStyle: undefined, barMaxWidth: undefined, animationDelay: (index) => index * 90, animationEasing: "quarticOut" }],
    };
  }

  // F8 · Plumb Scatter. The source x/y plane remains untouched; each point is
  // suspended from a quiet baseline and verification is carried by fill state.
  function plumbScatter(option, ctx, id) {
    if (["racecourseWinsChart", "racecourseStartsChart"].includes(id)) {
      const rows = option.lieflatData?.rows || [];
      const startValues = rows.map((row) => Number(row.starts || 0)).filter((value) => value > 0);
      const minStarts = startValues.length ? Math.min(...startValues) : 0;
      const maxStarts = Math.max(...startValues, 1);
      const startsMode = id === "racecourseStartsChart";
      const points = rows.map((row) => ({
        name: row.label,
        value: [Number(startsMode ? row.starts : row.wins_starts || 0), Number(startsMode ? row.top3_rate : row.win_start_rate || 0) * 100, Number(row.starts || 0)],
        raw: row,
        symbolSize: 7 + Math.pow(maxStarts === minStarts ? 0.55 : clamp((Number(row.starts || 0) - minStarts) / (maxStarts - minStarts), 0, 1), 0.62) * 20,
      }));
      return plumbOption(option, ctx, points, {
        xName: startsMode ? "出赛数" : "胜场数",
        yName: startsMode ? "前三率" : "胜率",
        label: (row) => row.name,
        tooltip: (row) => startsMode
          ? `${row.name}<br>出赛 ${ctx.formatNumber(row.raw.starts)}<br>前三率 ${ctx.formatNumber(row.value[1], 1)}% · ${ctx.formatNumber(row.raw.top3)}/${ctx.formatNumber(row.raw.starts)}`
          : `${row.name}<br>胜场 ${ctx.formatNumber(row.raw.wins_starts)} · 出赛 ${ctx.formatNumber(row.raw.starts)}<br>胜率 ${ctx.formatNumber(row.value[1], 1)}% · ${ctx.formatNumber(row.raw.wins_starts)}/${ctx.formatNumber(row.raw.starts)}`,
      });
    }
    const source = option.series?.[0] || {};
    const rawPoints = (source.data || []).map((item) => ({ ...objectRow(item), name: item.raw?.name || "", value: item.value }));
    const dosageSizes = rawPoints.map((item) => Number(item.value?.[2] || 0)).filter((value) => value > 0);
    const minDosage = dosageSizes.length ? Math.min(...dosageSizes) : 0;
    const maxDosage = Math.max(...dosageSizes, 1);
    const points = rawPoints.map((item) => {
      const value = Number(item.value?.[2] || 0);
      const normalized = maxDosage === minDosage ? 0.55 : (value - minDosage) / (maxDosage - minDosage);
      return { ...item, symbolSize: value ? 7 + Math.pow(clamp(normalized, 0, 1), 0.62) * 17 : 6 };
    });
    return plumbOption(option, ctx, points, {
      xName: "DI",
      yName: "CD",
      label: () => "",
      verified: (row) => row.raw?.status === "verified",
      tooltip: (row) => typeof option.tooltip?.formatter === "function" ? option.tooltip.formatter({ data: row }) : row.name,
    });
  }

  function plumbOption(option, ctx, points, config) {
    const yValues = points.map((row) => Number(row.value?.[1])).filter(Number.isFinite);
    const baseline = Math.min(...yValues, 0);
    const renderItem = (params, api) => {
      const row = points[params.dataIndex];
      const point = api.coord([api.value(0), api.value(1)]);
      const floor = api.coord([api.value(0), baseline]);
      const verified = config.verified ? config.verified(row) : true;
      const radius = Number(row.symbolSize || 9) / 2;
      const children = [
        { type: "line", shape: { x1: point[0], y1: point[1], x2: floor[0], y2: floor[1] }, style: { stroke: ctx.theme.line, lineWidth: 1, opacity: 0.7 } },
        { type: "circle", shape: { cx: point[0], cy: point[1], r: radius }, style: { fill: verified ? ctx.colors.duramente : ctx.theme.paper, stroke: ctx.colors.duramente, lineWidth: verified ? 1 : 1.8, opacity: verified ? 0.82 : 1 } },
      ];
      const label = config.label(row);
      if (label) children.push({ type: "text", style: { x: point[0] + radius + 4, y: point[1] - 3, text: label, fill: ctx.theme.text, font: "700 9px Inter, sans-serif" } });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => config.tooltip(params.data) },
      grid: { ...(option.grid || {}), left: 58, right: 26, top: 26, bottom: 48 },
      xAxis: { type: "value", name: config.xName, scale: true, splitLine: { show: false } },
      yAxis: { type: "value", name: config.yName, scale: true, axisLabel: { formatter: config.yName.includes("率") ? "{value}%" : undefined }, splitLine: { show: false } },
      series: [{ type: "custom", name: config.yName, data: points, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => Math.min(index * 3, 520), animationEasing: "quarticOut" }],
    };
  }

  // L16 · Matrix Heat. A categorical ledger replaces paired bars: columns are
  // months, rows are sex groups, and fill density is the selected rate.
  function matrixHeat(option, ctx) {
    const compact = global.matchMedia?.("(max-width: 640px)")?.matches;
    const months = [...(option.xAxis?.data || [])];
    const groups = (option.series || []).map((series) => series.name);
    const values = [];
    groups.forEach((group, groupIndex) => {
      (option.series[groupIndex]?.data || []).forEach((item, monthIndex) => {
        const row = objectRow(item);
        const value = row.total > 0 ? Number(row.value) : null;
        values.push({ name: `${months[monthIndex]} · ${group}`, value: [monthIndex, groupIndex, value], raw: row, group, month: months[monthIndex] });
      });
    });
    const finite = values.map((row) => row.value[2]).filter(Number.isFinite);
    const minValue = finite.length ? Math.min(...finite) : 0;
    const maxValue = Math.max(...finite, 1);
    const renderItem = (params, api) => {
      const row = values[params.dataIndex];
      const point = api.coord([api.value(0), api.value(1)]);
      const cell = api.size([1, 1]);
      const value = Number(api.value(2));
      const empty = !Number.isFinite(row.value[2]);
      const normalized = maxValue === minValue ? 0.55 : (value - minValue) / (maxValue - minValue);
      const opacity = empty ? 0.06 : 0.14 + clamp(normalized, 0, 1) * 0.78;
      const width = Math.max(8, Math.abs(cell[0]) - 5);
      const height = Math.max(18, Math.abs(cell[1]) - 8);
      const children = [{ type: "rect", shape: { x: point[0] - width / 2, y: point[1] - height / 2, width, height, r: 3 }, style: { fill: empty ? ctx.theme.line : ctx.colors.duramente, opacity, stroke: value === maxValue ? ctx.colors.gold : ctx.theme.paper, lineWidth: value === maxValue ? 1.4 : 1 } }];
      if (!empty && !compact) children.push({ type: "text", style: { x: point[0], y: point[1] + 3, text: `${ctx.formatNumber(value, 1)}%`, fill: opacity > 0.58 ? ctx.theme.paper : ctx.theme.text, font: "800 9px Inter, sans-serif", align: "center" } });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => {
        const row = params.data;
        if (!row.raw.total) return `${row.month} · ${row.group}<br>无样本`;
        return `${row.month} · ${row.group}<br>${ctx.formatNumber(row.value[2], 1)}% · ${ctx.formatNumber(row.raw.hits)}/${ctx.formatNumber(row.raw.total)}`;
      } },
      grid: { left: compact ? 50 : 66, right: compact ? 6 : 20, top: 34, bottom: 42 },
      xAxis: { type: "category", data: months, position: "top", axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: groups, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: "月度矩阵", data: values, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => index * 22, animationEasing: "quarticOut" }],
    };
  }

  function matrixHeatCells(option, ctx) {
    const xLabels = [...(option.xAxis?.data || [])];
    const yLabels = [...(option.yAxis?.data || [])];
    const source = option.series?.[0] || {};
    const rows = (source.data || []).map((item) => ({ name: `${yLabels[item[1]]} × ${xLabels[item[0]]}`, value: item }));
    const values = rows.map((row) => Number(row.value[2])).filter(Number.isFinite);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const renderItem = (params, api) => {
      const point = api.coord([api.value(0), api.value(1)]);
      const cell = api.size([1, 1]);
      const value = Number(api.value(2));
      const normalized = maxValue === minValue ? 0.55 : (value - minValue) / (maxValue - minValue);
      const opacity = value ? 0.14 + clamp(normalized, 0, 1) * 0.78 : 0.05;
      const width = Math.max(10, Math.abs(cell[0]) - 5);
      const height = Math.max(16, Math.abs(cell[1]) - 5);
      return { type: "group", children: [
        { type: "rect", shape: { x: point[0] - width / 2, y: point[1] - height / 2, width, height, r: 3 }, style: { fill: value ? ctx.colors.duramente : ctx.theme.line, opacity, stroke: value === maxValue ? ctx.colors.gold : ctx.theme.paper, lineWidth: value === maxValue ? 1.5 : 1 } },
        { type: "text", style: { x: point[0], y: point[1] + 3, text: value ? ctx.formatNumber(value) : "—", fill: opacity > 0.58 ? ctx.theme.paper : ctx.theme.text, font: "800 9px Inter, sans-serif", align: "center" } },
      ] };
    };
    return {
      ...option,
      visualMap: undefined,
      tooltip: { trigger: "item", formatter: (params) => typeof option.tooltip?.formatter === "function" ? option.tooltip.formatter({ value: params.data.value }) : params.data.name },
      grid: { ...(option.grid || {}), bottom: 42 },
      xAxis: { ...option.xAxis, splitLine: { show: false }, axisTick: { show: false } },
      yAxis: { ...option.yAxis, splitLine: { show: false }, axisTick: { show: false } },
      series: [{ type: "custom", name: "母龄×胎次", data: rows, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => index * 22, animationEasing: "quarticOut" }],
    };
  }

  // L13 · Hourglass Stream. Every original crop remains visible as its own
  // seven-stage stream; band width is the original count divided by that
  // crop's foal count, so the cross-crop conversion comparison stays intact.
  function hourglassStream(option, ctx) {
    const stages = option.lieflatData?.stages || [];
    const cohorts = option.lieflatData?.cohorts || [];
    const colors = cohorts.map((_, index) => option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    const rows = cohorts.map((cohort, cohortIndex) => ({
      ...cohort,
      name: String(cohort.crop),
      value: [0, cohortIndex, Math.max(0, ...cohort.stages.map((stage) => Number(stage.rate || 0)))],
    }));
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const cohortIndex = Number(api.value(1));
      const color = colors[cohortIndex] || ctx.colors.duramente;
      const centers = row.stages.map((_, stageIndex) => api.coord([stageIndex, cohortIndex]));
      const halfWidths = row.stages.map((stage) => 2.2 + clamp(Number(stage.rate || 0), 0, 1) * 15);
      const children = [];
      for (let stageIndex = 0; stageIndex < centers.length - 1; stageIndex += 1) {
        const current = centers[stageIndex];
        const next = centers[stageIndex + 1];
        const currentHalf = halfWidths[stageIndex];
        const nextHalf = halfWidths[stageIndex + 1];
        children.push({
          type: "polygon",
          shape: { points: [[current[0], current[1] - currentHalf], [next[0], next[1] - nextHalf], [next[0], next[1] + nextHalf], [current[0], current[1] + currentHalf]] },
          style: { fill: color, opacity: 0.16, stroke: color, lineWidth: 1 },
        });
      }
      row.stages.forEach((stage, stageIndex) => {
        const center = centers[stageIndex];
        const half = halfWidths[stageIndex];
        const tickCount = Math.max(1, Math.min(9, Math.ceil(Number(stage.rate || 0) * 9)));
        for (let tick = 0; tick < tickCount; tick += 1) {
          const y = center[1] - half + (half * 2) * (tick + 0.5) / tickCount;
          children.push({ type: "line", shape: { x1: center[0] - 4, y1: y, x2: center[0] + 4, y2: y }, style: { stroke: color, lineWidth: 1.2, opacity: 0.9 } });
        }
        children.push(
          { type: "circle", shape: { cx: center[0], cy: center[1], r: 3 }, style: { fill: color, stroke: ctx.theme.paper, lineWidth: 1 } },
          { type: "text", style: { x: center[0], y: center[1] - half - 6, text: ctx.formatNumber(stage.count), fill: ctx.theme.text, font: "800 9px Inter, sans-serif", align: "center" } },
        );
      });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => `${params.data.crop}年出生 · ${ctx.formatNumber(params.data.foals)}匹产驹<br>${params.data.stages.map((stage) => `${stage.label}：${ctx.formatNumber(stage.count)}匹 · ${ctx.formatNumber(Number(stage.rate || 0) * 100, 1)}%`).join("<br>")}` },
      grid: { left: 54, right: 24, top: 46, bottom: 50 },
      xAxis: { type: "category", data: stages.map((row) => row.label), position: "top", axisTick: { show: false }, axisLine: { lineStyle: { color: ctx.theme.line } }, splitLine: { show: false } },
      yAxis: { type: "category", data: cohorts.map((row) => `${row.crop}年`), inverse: true, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: "世代成就转化", data: rows, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => index * 90, animationEasing: "quarticOut" }],
    };
  }

  // G21 · Rank Strip. Time is read left-to-right and cell tone encodes rank;
  // the exact rank remains printed in every cell.
  function rankStrip(option, ctx) {
    const years = [...(option.xAxis?.data || [])];
    const source = option.series?.[0] || {};
    const rows = (source.data || []).map((item, index) => {
      const rawValue = item && typeof item === "object" && !Array.isArray(item) ? item.value : item;
      const rank = rawValue == null ? Number.NaN : Number(rawValue);
      return { name: String(years[index]), year: years[index], rank, value: [index, 0, rank], raw: objectRow(item).raw };
    });
    const ranks = rows.map((row) => row.rank).filter(Number.isFinite);
    const worst = Math.max(...ranks, 10);
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const center = api.coord([api.value(0), 0]);
      const size = api.size([1, 1]);
      const active = Number.isFinite(row.rank);
      const opacity = active ? 0.16 + (1 - (row.rank - 1) / Math.max(1, worst - 1)) * 0.72 : 0.06;
      return { type: "group", children: [
        { type: "rect", shape: { x: center[0] - Math.abs(size[0]) * 0.43, y: center[1] - 34, width: Math.abs(size[0]) * 0.86, height: 68, r: 4 }, style: { fill: row.rank === 1 ? ctx.colors.gold : ctx.colors.duramente, opacity, stroke: row.rank === 1 ? ctx.colors.gold : ctx.theme.paper, lineWidth: row.rank === 1 ? 1.5 : 1 } },
        { type: "text", style: { x: center[0], y: center[1] + 5, text: active ? String(row.rank) : "—", fill: active && opacity > 0.55 ? ctx.theme.paper : ctx.theme.text, font: "900 18px Inter, sans-serif", align: "center" } },
      ] };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => `${params.data.year}<br>ドゥラメンテ排名：${Number.isFinite(params.data.rank) ? params.data.rank : "—"}` },
      grid: { left: 18, right: 18, top: 46, bottom: 44 },
      xAxis: { type: "category", data: years, position: "top", axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: ["ドゥラメンテ"], axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: source.name, data: rows, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => index * 85, animationEasing: "quarticOut" }],
    };
  }

  // L11 · Trend Lineage. One row is one graded winner; the first and last
  // graded win define the season line, filled events mark actual victories and
  // hollow annual nodes expose dormant intervals.
  function trendLineage(option, ctx) {
    const events = option.lieflatData?.events || [];
    const grouped = new Map();
    events.forEach((event) => {
      if (!grouped.has(event.horse)) grouped.set(event.horse, []);
      grouped.get(event.horse).push(event);
    });
    const horses = [...grouped.entries()].sort((a, b) => String(a[1][0]?.race_date || "").localeCompare(String(b[1][0]?.race_date || "")) || b[1].length - a[1].length);
    const horseRows = horses.map(([horse, horseEvents], index) => {
      const sorted = [...horseEvents].sort((a, b) => String(a.race_date).localeCompare(String(b.race_date)));
      const times = sorted.map((event) => Date.parse(String(event.race_date).replaceAll("/", "-")));
      return { kind: "horse", name: horse, events: sorted, value: [Math.min(...times), index + 1, Math.max(...times)] };
    });
    const years = (option.lieflatData?.years || [...new Set(events.map((event) => Number(String(event.race_date || "").slice(0, 4))).filter(Number.isFinite))]).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    let cumulative = 0;
    const annualRows = years.map((year) => {
      const yearEvents = events.filter((event) => Number(String(event.race_date || "").slice(0, 4)) === year);
      const byGrade = Object.fromEntries(["G1", "G2", "G3"].map((grade) => [grade, yearEvents.filter((event) => event.grade_group === grade).length]));
      cumulative += yearEvents.length;
      const timestamp = Date.parse(`${year}-07-01`);
      return { kind: "annual", name: String(year), year, count: yearEvents.length, cumulative, byGrade, value: [timestamp, 0, timestamp] };
    });
    const rows = [...annualRows, ...horseRows];
    const allTimes = horseRows.flatMap((row) => [row.value[0], row.value[2]]);
    const minTime = years.length ? Date.parse(`${years[0]}-01-01`) : Math.min(...allTimes);
    const maxTime = years.length ? Date.parse(`${years.at(-1)}-12-31`) : Math.max(...allTimes);
    const annualCounts = annualRows.map((row) => row.count).filter((value) => value > 0);
    const minAnnual = annualCounts.length ? Math.min(...annualCounts) : 0;
    const maxAnnual = Math.max(...annualCounts, 1);
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      if (row.kind === "annual") {
        const center = api.coord([api.value(0), 0]);
        const normalized = maxAnnual === minAnnual ? 0.55 : (row.count - minAnnual) / (maxAnnual - minAnnual);
        const radius = row.count ? 3.5 + Math.pow(clamp(normalized, 0, 1), 0.62) * 6.5 : 2.8;
        return { type: "group", children: [
          { type: "circle", shape: { cx: center[0], cy: center[1], r: radius }, style: { fill: row.count ? ctx.colors.duramente : ctx.theme.paper, stroke: row.count ? ctx.theme.paper : ctx.theme.muted, lineWidth: 1.2, opacity: row.count ? 0.86 : 1 } },
          { type: "text", style: { x: center[0], y: center[1] - radius - 6, text: `${row.count} · Σ${row.cumulative}`, fill: ctx.theme.text, font: "800 9px Inter, sans-serif", align: "center" } },
        ] };
      }
      const y = Number(api.value(1));
      const start = api.coord([api.value(0), y]);
      const end = api.coord([api.value(2), y]);
      const children = [{ type: "line", shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] }, style: { stroke: ctx.theme.line, lineWidth: 1.2 } }];
      const firstYear = new Date(row.value[0]).getFullYear();
      const lastYear = new Date(row.value[2]).getFullYear();
      for (let year = firstYear; year <= lastYear; year += 1) {
        const ts = Date.parse(`${year}-07-01`);
        if (ts > row.value[0] && ts < row.value[2]) {
          const point = api.coord([ts, y]);
          children.push({ type: "circle", shape: { cx: point[0], cy: point[1], r: 3.2 }, style: { fill: ctx.theme.paper, stroke: ctx.theme.muted, lineWidth: 1 } });
        }
      }
      row.events.forEach((event) => {
        const ts = Date.parse(String(event.race_date).replaceAll("/", "-"));
        const point = api.coord([ts, y]);
        const g1 = event.grade_group === "G1";
        children.push({ type: "circle", shape: { cx: point[0], cy: point[1], r: g1 ? 4.8 : 3.7 }, style: { fill: g1 ? ctx.colors.gold : ctx.colors.duramente, stroke: ctx.theme.paper, lineWidth: 1.1 } });
      });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.kind === "annual"
        ? `${params.data.year}年<br>G1：${params.data.byGrade.G1}<br>G2：${params.data.byGrade.G2}<br>G3：${params.data.byGrade.G3}<br>当年合计：${params.data.count}<br>累计：${params.data.cumulative}`
        : `${params.data.name}<br>${params.data.events.map((event) => `${event.race_date} · ${event.grade_group} · ${event.race_name}`).join("<br>")}` },
      grid: { left: 142, right: 26, top: 38, bottom: 42 },
      xAxis: { type: "time", min: minTime, max: maxTime, axisLabel: { formatter: "{yyyy}" }, splitLine: { show: false } },
      yAxis: { type: "category", data: ["年度合计", ...horses.map(([horse]) => horse)], inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: "重赏胜马生涯", data: rows, encode: { x: [0, 2], y: 1 }, renderItem, animationDelay: (index) => Math.min(index * 55, 520), animationEasing: "quarticOut" }],
    };
  }

  // G13 · Custom Pie. Angle represents share and radial reach represents the
  // second metric; concentric rings are solid, quiet references rather than a grid.
  function customPie(option, ctx) {
    const slices = option.lieflatData?.slices || [];
    const shareTotal = Math.max(slices.reduce((sum, row) => sum + Number(row.share || 0), 0), 1);
    const intensityValues = slices.filter((row) => row.intensity != null).map((row) => Number(row.intensity)).filter(Number.isFinite);
    const minIntensity = intensityValues.length ? Math.min(...intensityValues) : 0;
    const maxIntensity = Math.max(...intensityValues, 1);
    let cursor = -Math.PI / 2;
    const rows = slices.map((row, index) => {
      const startAngle = cursor;
      const endAngle = cursor + Math.PI * 2 * Number(row.share || 0) / shareTotal;
      cursor = endAngle;
      return { ...row, name: row.name, startAngle, endAngle, value: [index, Number(row.share || 0), Number(row.intensity || 0)] };
    });
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const width = api.getWidth();
      const height = api.getHeight();
      const compact = width < 560;
      const cx = width * (compact ? 0.5 : 0.43);
      const cy = height * 0.52;
      const maxR = Math.min(width * (compact ? 0.31 : 0.29), height * 0.38);
      const r0 = maxR * 0.32;
      const radialScale = maxIntensity === minIntensity ? 0.65 : (Number(row.intensity || 0) - minIntensity) / (maxIntensity - minIntensity);
      const radius = r0 + clamp(radialScale, 0, 1) * (maxR - r0);
      const mid = (row.startAngle + row.endAngle) / 2;
      const color = row.name === "其他" ? ctx.theme.muted : ctx.colors.duramente;
      const children = [];
      if (params.dataIndex === 0) {
        [0.5, 0.75, 1].forEach((ratio) => children.push({ type: "circle", silent: true, shape: { cx, cy, r: r0 + (maxR - r0) * ratio }, style: { fill: "transparent", stroke: ctx.theme.line, lineWidth: 1, opacity: 0.58 } }));
      }
      children.push({ type: "sector", shape: { cx, cy, r0, r: radius, startAngle: row.startAngle, endAngle: row.endAngle, clockwise: true }, style: { fill: color, opacity: 0.24 + (params.dataIndex % 4) * 0.16, stroke: ctx.theme.paper, lineWidth: 1.4 } });
      const direct = compact ? params.dataIndex < 4 : Number(row.share || 0) >= 3 || params.dataIndex < 6;
      if (direct) {
        const anchorR = Math.max(radius, maxR * 0.82);
        const ax = cx + Math.cos(mid) * anchorR;
        const ay = cy + Math.sin(mid) * anchorR;
        const lx = cx + Math.cos(mid) * (maxR + (compact ? 10 : 16));
        const ly = cy + Math.sin(mid) * (maxR + (compact ? 10 : 16));
        const fullName = String(row.name);
        const shortName = compact && [...fullName].length > 7 ? `${[...fullName].slice(0, 7).join("")}…` : fullName;
        const onRight = Math.cos(mid) >= 0;
        const textX = compact ? (onRight ? width - 4 : 4) : lx + (onRight ? 4 : -4);
        children.push(
          { type: "line", shape: { x1: ax, y1: ay, x2: lx, y2: ly }, style: { stroke: ctx.theme.muted, lineWidth: 1 } },
          { type: "text", style: { x: textX, y: ly + 3, text: `${shortName} ${ctx.formatNumber(row.share, 1)}%`, fill: ctx.theme.text, font: `700 ${compact ? 8 : 9}px Inter, sans-serif`, align: compact ? (onRight ? "right" : "left") : (onRight ? "left" : "right") } },
        );
      }
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      grid: undefined,
      xAxis: undefined,
      yAxis: undefined,
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml || `${params.data.name}<br>占比 ${ctx.formatNumber(params.data.share, 1)}%<br>${params.data.intensityLabel || ctx.formatNumber(params.data.intensity, 1)}` },
      series: [{ type: "custom", coordinateSystem: "none", name: "角度与半径", data: rows, renderItem, animationDelay: (index) => index * 55, animationEasing: "quarticOut" }],
    };
  }

  function breederBubbleAlmanac(option, ctx) {
    const breeders = [...(option.yAxis?.data || [])];
    const years = (option.series || []).map((series) => series.name);
    const points = [];
    breeders.forEach((breeder, breederIndex) => {
      (option.series || []).forEach((series, yearIndex) => {
        const row = objectRow(series.data?.[breederIndex]);
        const count = scalar(row);
        points.push({ name: breeder, year: series.name, value: [yearIndex, breederIndex, count], raw: row.raw, color: ctx.colors.duramente });
      });
    });
    const positiveValues = points.map((row) => Number(row.value[2])).filter((value) => value > 0);
    const minValue = positiveValues.length ? Math.min(...positiveValues) : 0;
    const maxValue = Math.max(...positiveValues, 1);
    const renderItem = (params, api) => {
      const row = points[params.dataIndex];
      const center = api.coord([api.value(0), api.value(1)]);
      const value = Number(api.value(2));
      const normalized = maxValue === minValue ? 0.55 : (value - minValue) / (maxValue - minValue);
      const radius = value ? 2.4 + Math.pow(clamp(normalized, 0, 1), 0.62) * 14 : 1.2;
      const polygon = [];
      for (let step = 0; step < 18; step += 1) {
        const angle = step / 18 * Math.PI * 2;
        const wobble = 1 + 0.06 * Math.sin(angle * 2 + params.dataIndex);
        polygon.push([center[0] + Math.cos(angle) * radius * wobble, center[1] + Math.sin(angle) * radius * wobble]);
      }
      return { type: "group", children: value ? [
        { type: "polygon", shape: { points: polygon }, style: { fill: ctx.colors.duramente, opacity: 0.22 + (Number(row.year) - Number(years[0])) / Math.max(1, years.length - 1) * 0.62, stroke: ctx.theme.paper, lineWidth: 1 } },
        { type: "circle", shape: { cx: center[0], cy: center[1], r: 1.5 }, style: { fill: ctx.colors.gold } },
      ] : [{ type: "circle", shape: { cx: center[0], cy: center[1], r: 1.1 }, style: { fill: ctx.theme.line } }] };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => `${params.data.name} · ${params.data.year}<br>产驹 ${ctx.formatNumber(params.data.value[2])}匹` },
      grid: { left: 146, right: 24, top: 38, bottom: 42 },
      xAxis: { type: "category", data: years, position: "top", axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: breeders, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: "牧场×世代", data: points.sort((a, b) => b.value[2] - a.value[2]), encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => Math.min(index * 18, 520), animationEasing: "quarticOut" }],
    };
  }

  function originalAxisTooltip(option, categories, sourceSeries, colors, rowIndex) {
    const items = sourceSeries.map((series, seriesIndex) => ({
      axisValue: categories[rowIndex],
      name: categories[rowIndex],
      seriesName: series.name,
      marker: marker(colors[seriesIndex]),
      value: scalar(series.data?.[rowIndex]),
      data: objectRow(series.data?.[rowIndex]),
      dataIndex: rowIndex,
    }));
    return typeof option.tooltip?.formatter === "function"
      ? option.tooltip.formatter(items)
      : `${categories[rowIndex]}<br>${items.map((item) => `${item.seriesName} ${item.value}`).join("<br>")}`;
  }

  // F6 · Connected Dots. For three or four related rate series, a shared
  // horizontal range is more legible than four adjacent rung columns. Every
  // source series and original tooltip row is preserved.
  function multiRateDots(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const colors = sourceSeries.map((series, index) => series.itemStyle?.color || option.color?.[index] || [ctx.colors.duramente, ctx.colors.blue, ctx.colors.rose, ctx.colors.gold][index % 4]);
    const allValues = sourceSeries.flatMap((series) => (series.data || []).map(scalar).filter(Number.isFinite));
    const maxValue = Math.max(Number((Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis)?.max || 0), ...allValues, 1);
    const rows = categories.map((category, categoryIndex) => ({
      name: category,
      value: [categoryIndex, ...sourceSeries.map((series) => scalar(series.data?.[categoryIndex]))],
      raw: sourceSeries.map((series) => objectRow(series.data?.[categoryIndex])),
      tooltipHtml: originalAxisTooltip(option, categories, sourceSeries, colors, categoryIndex),
    }));
    const renderItem = (params, api) => {
      const index = Number(api.value(0));
      const values = sourceSeries.map((_, seriesIndex) => Number(api.value(seriesIndex + 1))).filter(Number.isFinite);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const minIndex = sourceSeries.findIndex((_, seriesIndex) => Number(api.value(seriesIndex + 1)) === min);
      const maxIndex = sourceSeries.findIndex((_, seriesIndex) => Number(api.value(seriesIndex + 1)) === max);
      const start = api.coord([min, index]);
      const end = api.coord([max, index]);
      const children = [{ type: "line", shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] }, style: { stroke: ctx.theme.line, lineWidth: 1.2 } }];
      sourceSeries.forEach((series, seriesIndex) => {
        const value = Number(api.value(seriesIndex + 1));
        if (!Number.isFinite(value)) return;
        const point = api.coord([value, index]);
        const hollow = seriesIndex > 0 && seriesIndex % 2 === 1;
        children.push({ type: "circle", shape: { cx: point[0], cy: point[1], r: seriesIndex === 0 ? 4.6 : 4 }, style: { fill: hollow ? ctx.theme.paper : colors[seriesIndex], stroke: colors[seriesIndex], lineWidth: hollow ? 1.7 : 1.1 } });
        if (seriesIndex === minIndex || seriesIndex === maxIndex) children.push({
          type: "text",
          style: { x: point[0], y: point[1] + (seriesIndex === minIndex ? 15 : -8), text: `${ctx.formatNumber(value, 1)}%`, fill: colors[seriesIndex], font: "800 8.5px Inter, sans-serif", align: "center" },
        });
      });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { left: 138, right: 26, top: 46, bottom: 38 },
      xAxis: { type: "value", min: 0, max: maxValue, axisLabel: { formatter: "{value}%" }, splitLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: "category", data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      graphic: sourceSeries.map((series, index) => ({ type: "text", left: 46 + index * 74, top: 10, style: { text: `${index > 0 && index % 2 === 1 ? "○" : "●"} ${series.name}`, fill: colors[index], font: "700 9px Inter, sans-serif" } })),
      series: [{ type: "custom", name: "组内比例比较", data: rows, encode: { x: sourceSeries.map((_, index) => index + 1), y: 0 }, renderItem, animationDelay: (index) => index * 65, animationEasing: "quarticOut" }],
    };
  }

  // F6 · Paired Rungs. Two measures share a categorical baseline, use separate
  // solid ladders, and keep exact values directly above their endpoints.
  function pairedRungs(option, ctx, id) {
    const categories = [...(option.xAxis?.data || [])];
    let sourceSeries = option.series || [];
    if (!["bmsSexPerformanceChart", "damAgePerformanceChart"].includes(id)) {
      sourceSeries = sourceSeries.slice(0, 2);
    }
    const colors = sourceSeries.map((series, index) => series.itemStyle?.color || option.color?.[index] || [ctx.colors.duramente, ctx.colors.gold, ctx.colors.coral, ctx.colors.plum][index % 4]);
    const allValues = sourceSeries.flatMap((series) => (series.data || []).map(scalar).filter(Number.isFinite));
    const maxValue = Math.max(...allValues, 1);
    const unit = niceUnit(maxValue / 16);
    const rows = categories.map((category, categoryIndex) => ({
      name: category,
      value: [categoryIndex, ...sourceSeries.map((series) => scalar(series.data?.[categoryIndex]))],
      raw: sourceSeries.map((series) => objectRow(series.data?.[categoryIndex])),
      tooltipHtml: originalAxisTooltip(option, categories, sourceSeries, colors, categoryIndex),
    }));
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const categoryIndex = Number(api.value(0));
      const categoryWidth = Math.abs(api.size([1, 0])[0]);
      const center = api.coord([categoryIndex, 0]);
      const gap = clamp(categoryWidth * (sourceSeries.length > 2 ? 0.09 : 0.13), 5, 13);
      const children = [];
      sourceSeries.forEach((series, seriesIndex) => {
        const value = Number(api.value(seriesIndex + 1));
        if (!Number.isFinite(value)) return;
        const x = center[0] + (seriesIndex - (sourceSeries.length - 1) / 2) * gap * 1.7;
        const top = api.coord([categoryIndex, value]);
        children.push({ type: "line", shape: { x1: x, y1: center[1], x2: x, y2: top[1] }, style: { stroke: colors[seriesIndex], lineWidth: 1, opacity: seriesIndex ? 0.72 : 0.95 } });
        const count = Math.max(1, Math.ceil(value / unit));
        for (let rung = 0; rung < count; rung += 1) {
          const rungValue = Math.min(value, (rung + 0.5) * unit);
          const y = api.coord([categoryIndex, rungValue])[1];
          children.push({ type: "line", shape: { x1: x - 4.5, y1: y, x2: x + 4.5, y2: y }, style: { stroke: colors[seriesIndex], lineWidth: 1.25, opacity: 0.9 } });
        }
        children.push({ type: "text", style: { x, y: top[1] - 7, text: `${ctx.formatNumber(value, value % 1 ? 1 : 0)}${String(option.yAxis?.name || "").includes("率") || String(option.yAxis?.name || "").includes("%") ? "%" : ""}`, fill: ctx.theme.text, font: "800 9px Inter, sans-serif", align: "center" } });
      });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { ...(option.grid || {}), left: 44, right: 20, top: 42, bottom: 52 },
      xAxis: { type: "category", data: categories, axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { ...(Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis), type: "value", max: Math.max(Number((Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis)?.max || 0), maxValue * 1.18), splitLine: { show: false } },
      graphic: sourceSeries.map((series, index) => ({ type: "text", left: 46 + index * 74, top: 12, style: { text: `${index ? "○" : "●"} ${series.name}`, fill: colors[index], font: "700 9px Inter, sans-serif" } })),
      series: [{ type: "custom", name: "配对梯线", data: rows, encode: { x: 0, y: sourceSeries.map((_, index) => index + 1) }, renderItem, animationDelay: (index) => index * 65, animationEasing: "quarticOut" }],
    };
  }

  // F7 · Stacked Ladder. Solid rung segments preserve the exact stacked totals
  // without using filled columns or patterned textures.
  function stackedLadder(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const colors = sourceSeries.map((series, index) => series.itemStyle?.color || option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    const totals = categories.map((_, categoryIndex) => sourceSeries.reduce((sum, series) => sum + Math.max(0, scalar(series.data?.[categoryIndex]) || 0), 0));
    const maxValue = Math.max(...totals, 1);
    const unit = niceUnit(maxValue / 24);
    const rows = categories.map((category, categoryIndex) => ({
      name: category,
      value: [categoryIndex, ...sourceSeries.map((series) => scalar(series.data?.[categoryIndex]) || 0)],
      raw: sourceSeries.map((series) => objectRow(series.data?.[categoryIndex])),
      tooltipHtml: originalAxisTooltip(option, categories, sourceSeries, colors, categoryIndex),
    }));
    const renderItem = (params, api) => {
      const index = Number(api.value(0));
      const base = api.coord([index, 0]);
      let cumulative = 0;
      const children = [];
      sourceSeries.forEach((series, seriesIndex) => {
        const value = Math.max(0, Number(api.value(seriesIndex + 1)) || 0);
        const start = cumulative;
        cumulative += value;
        const count = Math.max(value ? 1 : 0, Math.ceil(value / unit));
        for (let rung = 0; rung < count; rung += 1) {
          const y = api.coord([index, Math.min(cumulative, start + (rung + 0.5) * unit)])[1];
          children.push({ type: "line", shape: { x1: base[0] - 8, y1: y, x2: base[0] + 8, y2: y }, style: { stroke: colors[seriesIndex], lineWidth: 1.6, opacity: 0.92 } });
        }
      });
      const top = api.coord([index, cumulative]);
      children.unshift({ type: "line", shape: { x1: base[0], y1: base[1], x2: top[0], y2: top[1] }, style: { stroke: ctx.theme.line, lineWidth: 1 } });
      children.push({ type: "text", style: { x: top[0], y: top[1] - 7, text: ctx.formatNumber(cumulative), fill: ctx.theme.text, font: "850 10px Inter, sans-serif", align: "center" } });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { ...(option.grid || {}), top: 44, bottom: 42 },
      xAxis: { type: "category", data: categories, axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "value", max: maxValue * 1.16, splitLine: { show: false } },
      graphic: sourceSeries.map((series, index) => ({ type: "text", left: 46 + index * 74, top: 12, style: { text: `● ${series.name}`, fill: colors[index], font: "700 9px Inter, sans-serif" } })),
      series: [{ type: "custom", name: "堆叠梯线", data: rows, encode: { x: 0 }, renderItem, animationDelay: (index) => index * 65, animationEasing: "quarticOut" }],
    };
  }

  // F2 · Timeline Hairline. Filled bars become one-pixel trajectories with
  // small event points and direct terminal labels.
  function timelineHairline(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const colors = sourceSeries.map((series, index) => series.lineStyle?.color || series.itemStyle?.color || option.color?.[index] || ctx.theme.data[index % ctx.theme.data.length]);
    return {
      ...option,
      legend: { show: sourceSeries.length > 3, top: 0, type: "scroll" },
      grid: { ...(option.grid || {}), top: sourceSeries.length > 3 ? 54 : 32, bottom: 42, right: 60 },
      xAxis: { ...option.xAxis, axisTick: { show: false }, splitLine: { show: false } },
      yAxis: Array.isArray(option.yAxis)
        ? option.yAxis.map((axis) => ({ ...axis, splitLine: { show: false } }))
        : { ...option.yAxis, splitLine: { show: false } },
      series: sourceSeries.map((series, seriesIndex) => ({
        ...series,
        type: "line",
        stack: undefined,
        barMaxWidth: undefined,
        smooth: false,
        symbol: "circle",
        symbolSize: seriesIndex ? 5 : 6,
        showSymbol: true,
        itemStyle: { color: colors[seriesIndex], borderColor: ctx.theme.paper, borderWidth: 1 },
        lineStyle: { color: colors[seriesIndex], width: seriesIndex ? 1 : 1.35, opacity: seriesIndex ? 0.68 : 0.92 },
        areaStyle: undefined,
        label: sourceSeries.length === 1 ? { show: true, position: "top", color: ctx.theme.text, fontSize: 9, formatter: (params) => params.value == null ? "" : ctx.formatNumber(params.value, Number(params.value) % 1 ? 1 : 0) } : { show: false },
        endLabel: sourceSeries.length > 1 ? { show: true, formatter: series.name, color: colors[seriesIndex], fontSize: 9, fontWeight: 700 } : undefined,
        animationDelay: (index) => index * 70,
        animationEasing: "quarticOut",
      })),
    };
  }

  // F4 · Paired Edge Bars, rendered as two solid hairlines with endpoint dots.
  function pairedEdgeBars(option, ctx) {
    const categories = [...(option.yAxis?.data || [])];
    const sourceSeries = (option.series || []).slice(0, 2);
    const colors = [ctx.colors.duramente, ctx.colors.gold];
    const values = sourceSeries.flatMap((series) => (series.data || []).map(scalar));
    const maxValue = Math.max(...values, 1);
    const rows = categories.map((category, index) => ({ name: category, value: [index, ...sourceSeries.map((series) => scalar(series.data?.[index]))], raw: sourceSeries.map((series) => objectRow(series.data?.[index])), tooltipHtml: originalAxisTooltip(option, categories, sourceSeries, colors, index) }));
    const renderItem = (params, api) => {
      const index = Number(api.value(0));
      const center = api.coord([0, index]);
      const children = [];
      sourceSeries.forEach((series, seriesIndex) => {
        const value = Number(api.value(seriesIndex + 1));
        const end = api.coord([value, index]);
        const y = center[1] + (seriesIndex ? 4 : -4);
        children.push(
          { type: "line", shape: { x1: center[0], y1: y, x2: end[0], y2: y }, style: { stroke: colors[seriesIndex], lineWidth: 1.5, opacity: seriesIndex ? 0.72 : 0.95 } },
          { type: "circle", shape: { cx: end[0], cy: y, r: 3.4 }, style: { fill: seriesIndex ? ctx.theme.paper : colors[seriesIndex], stroke: colors[seriesIndex], lineWidth: 1.4 } },
          { type: "text", style: { x: end[0] + 6, y: y + 3, text: ctx.formatNumber(value), fill: ctx.theme.text, font: "800 9px Inter, sans-serif" } },
        );
      });
      return { type: "group", children };
    };
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { ...(option.grid || {}), top: 34, right: 64 },
      xAxis: { type: "value", max: maxValue * 1.18, splitLine: { show: false } },
      yAxis: { ...option.yAxis, data: categories, splitLine: { show: false } },
      graphic: sourceSeries.map((series, index) => ({ type: "text", left: 48 + index * 88, top: 9, style: { text: `${index ? "○" : "●"} ${series.name}`, fill: colors[index], font: "700 9px Inter, sans-serif" } })),
      series: [{ type: "custom", name: "配对边线", data: rows, encode: { x: [1, 2], y: 0 }, renderItem, animationDelay: (index) => index * 55, animationEasing: "quarticOut" }],
    };
  }

  // G15 · Jitter Strip. Aggregated age counts are expanded into one mark per
  // foal, preserving the count while revealing the distribution's mass.
  function jitterStrip(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const source = option.series?.[0] || {};
    const points = [];
    (source.data || []).forEach((item, categoryIndex) => {
      const count = Math.max(0, Math.round(scalar(item) || 0));
      for (let point = 0; point < count; point += 1) {
        points.push({ name: String(categories[categoryIndex]), count, value: [categoryIndex + (rnd(point + 1, categoryIndex + 2) - 0.5) * 0.5, rnd(point + 3, categoryIndex + 5)] });
      }
    });
    return {
      ...option,
      tooltip: { trigger: "item", formatter: (params) => `${params.data.name}岁<br>${ctx.formatNumber(params.data.count)}匹产驹` },
      grid: { ...(option.grid || {}), top: 26, bottom: 42 },
      xAxis: { type: "value", min: -0.6, max: categories.length - 0.4, interval: 1, axisLabel: { formatter: (value) => categories[Math.round(value)] ?? "" }, splitLine: { show: false } },
      yAxis: { type: "value", min: 0, max: 1, show: false, splitLine: { show: false } },
      series: [{ type: "scatter", name: "产驹", data: points, symbolSize: 4.4, itemStyle: { color: ctx.colors.duramente, opacity: 0.5 }, emphasis: { itemStyle: { opacity: 1 } }, animationDelay: (index) => Math.min(index * 2, 480), animationEasing: "quarticOut" }],
    };
  }

  function horizontalLollipop(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const source = option.series?.[0] || {};
    const rows = (source.data || []).map((item, index) => ({ name: categories[index], originalValue: scalar(item), value: [scalar(item), index], raw: objectRow(item).raw }));
    const maxValue = Math.max(...rows.map((row) => row.originalValue), 1);
    const renderItem = (params, api) => {
      const row = rows[params.dataIndex];
      const start = api.coord([0, api.value(1)]);
      const end = api.coord([api.value(0), api.value(1)]);
      return { type: "group", children: [
        { type: "line", shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] }, style: { stroke: ctx.colors.duramente, lineWidth: 1.4, opacity: 0.75 } },
        { type: "circle", shape: { cx: end[0], cy: end[1], r: 5 }, style: { fill: ctx.colors.duramente, stroke: ctx.theme.paper, lineWidth: 1.4 } },
        { type: "text", style: { x: end[0] + 9, y: end[1] + 3, text: ctx.formatNumber(row.originalValue, 2), fill: ctx.theme.text, font: "850 11px Inter, sans-serif" } },
      ] };
    };
    return {
      ...option,
      tooltip: { trigger: "item", formatter: (params) => `${params.data.name}<br>平均点数 ${ctx.formatNumber(params.data.originalValue, 2)}` },
      grid: { left: 48, right: 58, top: 24, bottom: 28 },
      xAxis: { type: "value", max: maxValue * 1.18, splitLine: { show: false } },
      yAxis: { type: "category", data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{ type: "custom", name: "平均 DP", data: rows, encode: { x: 0, y: 1 }, renderItem, animationDelay: (index) => index * 80, animationEasing: "quarticOut" }],
    };
  }

  function dualMetricRows(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = (option.series || []).slice(0, 2);
    const colors = [ctx.colors.duramente, ctx.colors.gold];
    const grids = [{ left: 90, right: 30, top: 30, height: 118 }, { left: 90, right: 30, top: 202, height: 118 }];
    const xAxes = sourceSeries.map((series, index) => ({ type: "value", gridIndex: index, name: series.name, nameLocation: "end", splitLine: { show: false } }));
    const yAxes = sourceSeries.map((series, index) => ({ type: "category", gridIndex: index, data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } }));
    const customSeries = sourceSeries.map((series, seriesIndex) => {
      const values = (series.data || []).map(scalar);
      const maxValue = Math.max(...values, 1);
      const unit = niceUnit(maxValue / 24);
      const rows = (series.data || []).map((item, index) => ({ name: categories[index], value: [scalar(item), index], originalValue: scalar(item), raw: objectRow(item).raw }));
      return {
        type: "custom",
        name: series.name,
        xAxisIndex: seriesIndex,
        yAxisIndex: seriesIndex,
        data: rows,
        encode: { x: 0, y: 1 },
        renderItem: (params, api) => {
          const row = rows[params.dataIndex];
          const start = api.coord([0, api.value(1)]);
          const end = api.coord([api.value(0), api.value(1)]);
          const count = Math.max(1, Math.ceil(row.originalValue / unit));
          const children = [{ type: "line", shape: { x1: start[0], y1: start[1] + 5, x2: end[0], y2: end[1] + 5 }, style: { stroke: ctx.theme.line, lineWidth: 1 } }];
          for (let tick = 0; tick < count; tick += 1) {
            const x = api.coord([Math.min(row.originalValue, (tick + 0.5) * unit), api.value(1)])[0];
            children.push({ type: "line", shape: { x1: x, y1: start[1] + 5, x2: x, y2: start[1] - 5 }, style: { stroke: colors[seriesIndex], lineWidth: 1.3 } });
          }
          children.push({ type: "text", style: { x: end[0] + 7, y: end[1] + 3, text: ctx.formatNumber(row.originalValue, row.originalValue % 1 ? 1 : 0), fill: ctx.theme.text, font: "800 9px Inter, sans-serif" } });
          return { type: "group", children };
        },
        animationDelay: (index) => index * 55,
        animationEasing: "quarticOut",
      };
    });
    return {
      ...option,
      tooltip: { trigger: "item", formatter: (params) => {
        const index = params.dataIndex;
        return originalAxisTooltip(option, categories, sourceSeries, colors, index);
      } },
      legend: { show: false },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series: customSeries,
    };
  }

  function multiDumbbell(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const sourceSeries = option.series || [];
    const colors = [ctx.colors.duramente, ctx.colors.gold, ctx.colors.coral];
    const rows = categories.map((category, index) => ({ name: category, value: [scalar(sourceSeries[1]?.data?.[index]), index, scalar(sourceSeries[2]?.data?.[index]), scalar(sourceSeries[0]?.data?.[index])], tooltipHtml: originalAxisTooltip(option, categories, sourceSeries, colors, index), raw: objectRow(sourceSeries[0]?.data?.[index]).raw }));
    const renderItem = (params, api) => {
      const turf = api.coord([api.value(0), api.value(1)]);
      const dirt = api.coord([api.value(2), api.value(1)]);
      const overall = api.coord([api.value(3), api.value(1)]);
      return { type: "group", children: [
        { type: "line", shape: { x1: turf[0], y1: turf[1], x2: dirt[0], y2: dirt[1] }, style: { stroke: ctx.colors.duramente, lineWidth: 1.5 } },
        { type: "circle", shape: { cx: turf[0], cy: turf[1], r: 4.5 }, style: { fill: ctx.theme.paper, stroke: ctx.colors.gold, lineWidth: 1.6 } },
        { type: "circle", shape: { cx: dirt[0], cy: dirt[1], r: 4.5 }, style: { fill: ctx.colors.coral } },
        { type: "circle", shape: { cx: overall[0], cy: overall[1], r: 2.5 }, style: { fill: ctx.colors.duramente } },
      ] };
    };
    return {
      ...option,
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      legend: { show: false },
      grid: { left: 62, right: 32, top: 34, bottom: 28 },
      xAxis: { type: "value", name: "平均胜距 m", scale: true, splitLine: { show: false } },
      yAxis: { type: "category", data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      graphic: [
        { type: "text", left: 64, top: 8, style: { text: "○ Turf", fill: ctx.colors.gold, font: "700 9px Inter, sans-serif" } },
        { type: "text", left: 126, top: 8, style: { text: "● Dirt", fill: ctx.colors.coral, font: "700 9px Inter, sans-serif" } },
        { type: "text", left: 188, top: 8, style: { text: "• Overall", fill: ctx.colors.duramente, font: "700 9px Inter, sans-serif" } },
      ],
      series: [{ type: "custom", name: "AWD", data: rows, encode: { x: [0, 2, 3], y: 1 }, renderItem, animationDelay: (index) => index * 75, animationEasing: "quarticOut" }],
    };
  }

  function countRateDots(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const countSeries = option.series?.[0] || {};
    const rateSeries = option.series?.[1] || {};
    const counts = (countSeries.data || []).map(scalar);
    const positiveCounts = counts.filter((value) => value > 0);
    const minCount = positiveCounts.length ? Math.min(...positiveCounts) : 0;
    const maxCount = Math.max(...positiveCounts, 1);
    const rows = categories.map((category, index) => ({
      name: category,
      count: counts[index],
      rate: scalar(rateSeries.data?.[index]),
      raw: objectRow(countSeries.data?.[index]).raw,
      value: [scalar(rateSeries.data?.[index]), index, counts[index]],
      tooltipHtml: originalAxisTooltip(option, categories, [countSeries, rateSeries], [ctx.colors.gold, ctx.colors.duramente], index),
    }));
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { left: 60, right: 86, top: 24, bottom: 32 },
      xAxis: { type: "value", name: "%", max: 100, splitLine: { show: false }, axisLabel: { formatter: "{value}%" } },
      yAxis: { type: "category", data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{
        type: "scatter",
        name: rateSeries.name,
        data: rows,
        symbolSize: (value) => {
          const count = Number(value[2] || 0);
          const normalized = maxCount === minCount ? 0.55 : (count - minCount) / (maxCount - minCount);
          return 7 + Math.pow(clamp(normalized, 0, 1), 0.62) * 19;
        },
        itemStyle: { color: ctx.colors.duramente, borderColor: ctx.theme.paper, borderWidth: 1.2, opacity: 0.82 },
        label: { show: true, position: "right", color: ctx.theme.text, fontSize: 10, fontWeight: 800, formatter: (params) => `${ctx.formatNumber(params.data.rate, 1)}% · ${ctx.formatNumber(params.data.count)}匹` },
        animationDelay: (index) => index * 75,
        animationEasing: "quarticOut",
      }],
    };
  }

  // F2 · Dot-line profile. Foal order is ordinal, so the original rate marks
  // are connected in sequence while bubble area continues to encode foal count.
  function countRateProfile(option, ctx) {
    const categories = [...(option.xAxis?.data || [])];
    const countSeries = option.series?.[0] || {};
    const rateSeries = option.series?.[1] || {};
    const counts = (countSeries.data || []).map(scalar);
    const positiveCounts = counts.filter((value) => value > 0);
    const minCount = positiveCounts.length ? Math.min(...positiveCounts) : 0;
    const maxCount = Math.max(...positiveCounts, 1);
    const rows = categories.map((category, index) => ({
      name: category,
      count: counts[index],
      rate: scalar(rateSeries.data?.[index]),
      raw: objectRow(countSeries.data?.[index]).raw,
      value: [scalar(rateSeries.data?.[index]), index, counts[index]],
      tooltipHtml: originalAxisTooltip(option, categories, [countSeries, rateSeries], [ctx.colors.gold, ctx.colors.duramente], index),
    }));
    return {
      ...option,
      legend: { show: false },
      tooltip: { trigger: "item", formatter: (params) => params.data.tooltipHtml },
      grid: { left: 64, right: 92, top: 26, bottom: 34 },
      xAxis: { type: "value", name: "%", max: 100, splitLine: { show: false }, axisLabel: { formatter: "{value}%" } },
      yAxis: { type: "category", data: categories, inverse: true, axisTick: { show: false }, splitLine: { show: false } },
      series: [{
        type: "line",
        name: rateSeries.name,
        data: rows,
        encode: { x: 0, y: 1 },
        symbol: "circle",
        symbolSize: (value) => {
          const count = Number(value[2] || 0);
          const normalized = maxCount === minCount ? 0.55 : (count - minCount) / (maxCount - minCount);
          return 7 + Math.pow(clamp(normalized, 0, 1), 0.62) * 17;
        },
        lineStyle: { color: ctx.theme.line, width: 1.2 },
        itemStyle: { color: ctx.colors.duramente, borderColor: ctx.theme.paper, borderWidth: 1.2 },
        label: { show: true, position: "right", color: ctx.theme.text, fontSize: 9.5, fontWeight: 800, formatter: (params) => `${ctx.formatNumber(params.data.rate, 1)}% · ${ctx.formatNumber(params.data.count)}匹` },
        animationDelay: (index) => index * 65,
        animationEasing: "quarticOut",
      }],
    };
  }

  function transform(id, option, ctx) {
    const template = TEMPLATE_BY_ID[id];
    if (!template) return option;
    if (template.startsWith("L20")) return parallelCoordinates(option, ctx);
    if (template.startsWith("L9")) return id === "breederCropChart" ? breederBubbleAlmanac(option, ctx) : bubbleAlmanac(option, ctx);
    if (template.startsWith("L11")) return trendLineage(option, ctx);
    if (template.startsWith("L13")) return hourglassStream(option, ctx);
    if (template.startsWith("L16")) return template.includes("CELLS") ? matrixHeatCells(option, ctx) : matrixHeat(option, ctx);
    if (template.startsWith("L4")) return arcMatrix(option, ctx);
    if (template.startsWith("L2")) return dotCascade(option, ctx);
    if (template.startsWith("F2")) return id === "damFoalOrderChart" ? countRateProfile(option, ctx) : timelineHairline(option, ctx);
    if (template.startsWith("F4")) return pairedEdgeBars(option, ctx);
    if (template.startsWith("F6")) return template.includes("CONNECTED DOTS") ? multiRateDots(option, ctx) : pairedRungs(option, ctx, id);
    if (template.startsWith("F7")) return stackedLadder(option, ctx);
    if (template.startsWith("F12")) return template.includes("MULTI-END") ? multiDumbbell(option, ctx) : dumbbellQueue(option, ctx);
    if (template.startsWith("G13")) return customPie(option, ctx);
    if (template.startsWith("G21")) return rankStrip(option, ctx);
    if (template.startsWith("G15")) return jitterStrip(option, ctx);
    if (template.startsWith("F8")) return plumbScatter(option, ctx, id);
    if (template.startsWith("G9")) return denseScatter(option, ctx);
    if (template.startsWith("F1")) return rungBars(option, ctx);
    if (template.includes("LOLLIPOP")) return horizontalLollipop(option, ctx);
    if (template.includes("DOT RANKING")) return countRateDots(option, ctx);
    if (template.startsWith("F5") && template.includes("PAIRED")) return dualMetricRows(option, ctx);
    return tickRows(option, ctx, template.includes("ENDPOINT"));
  }

  global.DuramentePedigreeLieflat = Object.freeze({ TEMPLATE_BY_ID, transform });
})(window);
