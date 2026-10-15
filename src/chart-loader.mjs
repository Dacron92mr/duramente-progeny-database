let pending;
/** List browsing never waits for the external chart library. Failed loads can be retried. */
export function loadChartLibrary() {
  if (window.echarts) return Promise.resolve();
  if (!pending) pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js';
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    function fail() { clearTimeout(timer); script.remove(); pending = null; reject(new Error('图表组件未能加载，请重试。')); }
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = fail;
    document.head.append(script);
  });
  return pending;
}
