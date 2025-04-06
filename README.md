# canvas-knockout-js

Small Canvas 2D time-series charts for live monitoring screens, with legacy
Knockout/AMD support kept intact.

The project started as a tiny graph renderer for memory-constrained interfaces
such as network traffic pages on embedded devices. It is now shaped as a small
framework-agnostic package for router dashboards, IoT panels, compact admin
tools and live operational metrics.

## Features

- Multiple line series on one `canvas`.
- Live updates through `append(label, values)`.
- Bounded history through `maxPoints`.
- DOM-free core model in `chart-core.js`.
- Canvas renderer with HiDPI/Retina scaling.
- `resize(width, height)` for responsive layouts.
- Fixed or autoscaled Y axis through `yMin`, `yMax`, `yPadding`.
- Axis formatters, units, gaps and threshold lines.
- ESM/CJS package output with TypeScript declarations.
- Web Component plus thin React, Vue and Svelte adapters.
- Legacy AMD/Knockout files still available.

## Install

```sh
npm install canvas-knockout-js
```

## Modern Usage

```js
import {create} from 'canvas-knockout-js';

const chart = create('traffic-canvas', 500, 300);

chart.init([], [
	{legend: {id: 'rx', text: 'rx', color: 'green'}},
	{legend: {id: 'tx', text: 'tx', color: 'blue'}}
], {text: 'Traffic'}, {
	maxPoints: 300,
	yMin: 0,
	yUnit: ' Mbps',
	thresholds: [{value: 900, label: 'limit', color: 'orange'}]
});

chart.append('00:01', {rx: 120, tx: 84});
chart.render();
```

## Web Component

```html
<time-series-chart id="traffic" max-points="300" height="280"></time-series-chart>

<script type="module">
	import 'canvas-knockout-js/web-component';

	const chart = document.getElementById('traffic');
	chart.setData([], [
		{legend: {id: 'rx', text: 'rx', color: 'green'}},
		{legend: {id: 'tx', text: 'tx', color: 'blue'}}
	], {text: 'Traffic'}, {yMin: 0, yUnit: ' Mbps'});

	chart.append('00:01', {rx: 120, tx: 84});
</script>
```

Framework adapters:

- `canvas-knockout-js/adapters/react`
- `canvas-knockout-js/adapters/vue`
- `canvas-knockout-js/adapters/svelte`

Legacy AMD modules:

- `canvas-knockout-js/legacy/amd/core`
- `canvas-knockout-js/legacy/amd/draw`
- `canvas-knockout-js/legacy/amd/knockout`

## Project Layout

- `chart-core.js` - DOM-free data normalization and plot model.
- `draw.js` - Canvas 2D renderer.
- `web-component.mjs` - `time-series-chart` custom element.
- `adapters/` - React, Vue and Svelte integration helpers.
- `dist/` - generated ESM/CJS package output and TypeScript declarations.
- `examples/` - live examples and benchmark page.
- `docs/` - development plan, getting started guide and comparison notes.

## Checks

```sh
npm run check
npm run test:unit
npm run test:e2e
npm run typecheck
npm run audit:prod
npm pack --dry-run
```

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Development Plan](docs/DEVELOPMENT_PLAN.md)
- [Comparison](docs/COMPARISON.md)
- [Contributing](CONTRIBUTING.md)

## Positioning

Use this project when you need a tiny live time-series chart with predictable
memory usage and a very small API surface. Use Chart.js, Apache ECharts or
uPlot when you need broader chart types, richer interaction systems or a
larger ecosystem.
