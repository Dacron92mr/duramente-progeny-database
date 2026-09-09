(function (global) {
  "use strict";

  // Geometry is transplanted from the matching cards in lieflat-charts:
  // templates/lupi-gallery.html and templates/basics-gallery.html.
  const TEMPLATE_BY_ID = Object.freeze({
    bmsCategoryScaleChart: "L2 · DOT CASCADE",
    bmsSexPerformanceChart: "L20 · PARALLEL COORDINATES",
    bmsCropShareChart: "L9 · BUBBLE ALMANAC",
    bmsSireContributionChart: "F5 · TICK ROWS",
    bmsSireEfficiencyChart: "F5 · TICK ROWS / ENDPOINT",
    femaleFamilyOverallChart: "F5 · TICK ROWS / ENDPOINT",
    femaleFamilySexChart: "L4 · ARC MATRIX",
    nickingLineChart: "F12 · DUMBBELL QUEUE",
    nickingSireChart: "F5 · TICK ROWS / ENDPOINT",
    crossAncestorCountChart: "L2 · DOT CASCADE",
    crossAncestorPerformanceChart: "F5 · TICK ROWS / ENDPOINT",
    dosageScatterChart: "G9 · SCATTER MORPH / DENSE VIEW",
    dosageProfileChart: "F1 · RUNG BARS",
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rnd = (i, k) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
  const scalar = (row) => {
    const value = row && typeof row === "object" && !Array.isArray(row) ? row.value : row;
    return Array.isArray(value) ? Number(value[0]) : Number(value);
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
        style: { stroke: ctx.theme.line, lineWidth: 1, lineDash: [2, 4] },
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
    const baseline = 1;
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
        children.push({
          type: "circle",
          shape: { cx: point[0], cy: point[1], r: value ? 2.2 + Math.sqrt(value) * 0.85 : 1.2 },
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
    const renderItem = (params, api) => {
      const point = points[params.dataIndex];
      const xIndex = Number(api.value(0));
      const yIndex = Number(api.value(1));
      const value = Number(api.value(2)) || 0;
      const center = api.coord([xIndex, yIndex]);
      const radius = value ? clamp(2.2 + Math.sqrt(value) * 1.45, 2.2, 16) : 1.2;
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

  function transform(id, option, ctx) {
    const template = TEMPLATE_BY_ID[id];
    if (!template) return option;
    if (template.startsWith("L20")) return parallelCoordinates(option, ctx);
    if (template.startsWith("L9")) return bubbleAlmanac(option, ctx);
    if (template.startsWith("L4")) return arcMatrix(option, ctx);
    if (template.startsWith("L2")) return dotCascade(option, ctx);
    if (template.startsWith("F12")) return dumbbellQueue(option, ctx);
    if (template.startsWith("G9")) return denseScatter(option, ctx);
    if (template.startsWith("F1")) return rungBars(option, ctx);
    return tickRows(option, ctx, template.includes("ENDPOINT"));
  }

  global.DuramentePedigreeLieflat = Object.freeze({ TEMPLATE_BY_ID, transform });
})(window);
