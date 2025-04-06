# Comparison

This project is intentionally narrow: live line charts for monitoring UIs with
small memory and API budgets.

## When To Use This Project

- You need a tiny live time-series chart.
- You mostly append samples rather than render many chart types.
- You want Canvas 2D and predictable memory behavior.
- You need framework-agnostic usage with optional thin adapters.
- You still need a legacy AMD/Knockout path.

## When To Use Something Else

Use Chart.js when you want a mature, general-purpose HTML5 Canvas charting
library with a broader community and more chart types.

Use Apache ECharts when you need a full visualization platform with many chart
types, component composition, Canvas/SVG rendering choices, progressive
rendering or very large datasets.

Use uPlot when you need a very mature, fast and memory-efficient Canvas 2D
time-series chart with a richer performance-focused ecosystem.

## Sources

- Chart.js official site: https://www.chartjs.org/
- Apache ECharts features: https://echarts.apache.org/en/feature.html
- Apache ECharts rendering notes: https://echarts.apache.org/en/index.html
- uPlot README: https://github.com/leeoniya/uPlot
