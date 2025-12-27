# Getting Started

This guide creates a live router traffic chart in a few minutes.

## 1. Add a Canvas

```html
<canvas id="traffic" style="width: 640px; height: 280px;"></canvas>
```

## 2. Create the Chart

```js
import {create} from '@llevella/signal-trace';

const chart = create('traffic', 640, 280);

chart.init([], [
	{legend: {id: 'rx', text: 'rx', color: 'green'}},
	{legend: {id: 'tx', text: 'tx', color: 'blue'}}
], {text: 'Router traffic'}, {
	maxPoints: 120,
	yMin: 0,
	yUnit: ' Mbps',
	thresholds: [{value: 900, label: 'limit', color: 'orange'}]
});
```

## 3. Append Live Samples

```js
setInterval(function() {
	chart.append(new Date().toLocaleTimeString(), {
		rx: Math.round(100 + Math.random() * 600),
		tx: Math.round(80 + Math.random() * 500)
	});
	chart.render();
}, 1000);
```

## 4. Resize

```js
window.addEventListener('resize', function() {
	chart.resize(640, 280, {render: true});
});
```

## Web Component Option

```html
<time-series-chart id="traffic" max-points="120" height="280"></time-series-chart>

<script type="module">
	import '@llevella/signal-trace/web-component';

	const chart = document.getElementById('traffic');
	chart.setData([], [
		{legend: {id: 'rx', text: 'rx', color: 'green'}},
		{legend: {id: 'tx', text: 'tx', color: 'blue'}}
	], {text: 'Router traffic'}, {yMin: 0, yUnit: ' Mbps'});
</script>
```
