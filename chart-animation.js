(function attachDuramenteAnimation(global) {
  "use strict";

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(progress) {
    const p = clamp(progress);
    return 1 - Math.pow(1 - p, 3);
  }

  function lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  function createTimeline({ duration, onFrame, onComplete, onReset }) {
    let frameId = null;
    let startedAt = 0;
    let elapsedBeforePause = 0;
    let token = 0;

    function reset() {
      token += 1;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      startedAt = 0;
      elapsedBeforePause = 0;
      onReset?.();
    }

    function start() {
      const activeToken = ++token;
      const tick = (timestamp) => {
        if (activeToken !== token) return;
        if (!startedAt) startedAt = timestamp - elapsedBeforePause;
        const elapsed = Math.min(timestamp - startedAt, duration);
        elapsedBeforePause = elapsed;
        onFrame(elapsed, clamp(elapsed / duration));
        if (elapsed >= duration) {
          frameId = null;
          onComplete?.();
          return;
        }
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    }

    function replay() {
      reset();
      start();
    }

    function pause() {
      if (frameId === null) return;
      token += 1;
      cancelAnimationFrame(frameId);
      frameId = null;
      elapsedBeforePause = startedAt
        ? Math.min(performance.now() - startedAt, duration)
        : elapsedBeforePause;
      startedAt = 0;
    }

    function resume() {
      if (frameId !== null || elapsedBeforePause >= duration) return;
      start();
    }

    return { replay, reset, pause, resume };
  }

  function enhanceEChartsSeries(series = []) {
    const hasBar = series.some((item) => item.type === "bar");
    return series.map((item) => {
      if (item.animation === false) return item;
      const visibleLabel = item.label?.show;
      const labelLayout = visibleLabel ? {
        ...(item.labelLayout || {}),
        hideOverlap: false,
        moveOverlap: "shiftY",
      } : item.labelLayout;
      const label = visibleLabel ? {
        ...item.label,
        distance: Math.max(Number(item.label.distance || 0), 8),
      } : item.label;
      if (item.type === "bar") {
        return {
          animationDuration: 700,
          animationDelay: (index) => Math.min(index * 65, 455),
          animationEasing: "cubicOut",
          ...item,
          label,
          labelLayout,
        };
      }
      if (item.type === "line") {
        return {
          animationDuration: 1050,
          animationDelay: hasBar ? 520 : 100,
          animationEasing: "cubicOut",
          ...item,
          label,
          labelLayout,
        };
      }
      return {
        animationDuration: 700,
        animationDelay: (index) => Math.min(index * 40, 360),
        animationEasing: "cubicOut",
        ...item,
        label,
        labelLayout,
      };
    });
  }

  function addValueAxisHeadroom(axis) {
    if (!axis || axis.type !== "value") return axis;
    return {
      ...axis,
      max: axis.max ?? ((range) => {
        if (!Number.isFinite(range.max) || range.max <= 0) return range.max;
        const floor = Math.min(0, Number(range.min) || 0);
        return range.max + (range.max - floor) * 0.18;
      }),
      axisLabel: { hideOverlap: true, ...(axis.axisLabel || {}) },
    };
  }

  function normalizeAxis(axis, valueAxis = false) {
    const rows = Array.isArray(axis) ? axis : [axis];
    const normalized = rows.map((item) => {
      if (!item) return item;
      const next = valueAxis ? addValueAxisHeadroom(item) : item;
      return {
        ...next,
        axisLabel: { hideOverlap: true, ...(next.axisLabel || {}) },
      };
    });
    return Array.isArray(axis) ? normalized : normalized[0];
  }

  function enhanceEChartsAxes(option = {}) {
    const normalizeByType = (axis) => {
      const rows = Array.isArray(axis) ? axis : [axis];
      const normalized = rows.map((item) => item?.type === "value" ? addValueAxisHeadroom(item) : normalizeAxis(item));
      return Array.isArray(axis) ? normalized : normalized[0];
    };
    return {
      xAxis: option.xAxis ? normalizeByType(option.xAxis) : option.xAxis,
      yAxis: option.yAxis ? normalizeByType(option.yAxis) : option.yAxis,
    };
  }

  global.DuramenteAnimation = Object.freeze({
    clamp,
    easeOutCubic,
    lerp,
    createTimeline,
    enhanceEChartsSeries,
    enhanceEChartsAxes,
  });
})(window);
