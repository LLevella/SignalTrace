'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function plain(value) {
	return JSON.parse(JSON.stringify(value));
}

function assertFiniteCoordinates(args) {
	for (let arg of args) {
		if (typeof arg === 'number') {
			assert(Number.isFinite(arg), 'canvas call received a non-finite coordinate');
		}
	}
}

function createFakeContext() {
	const calls = [];

	return {
		calls,
		font: '',
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		textBaseline: '',
		textAlign: '',
		setTransform(...args) {
			calls.push(['setTransform', ...args]);
		},
		beginPath() {
			calls.push(['beginPath']);
		},
		arc(...args) {
			assertFiniteCoordinates(args);
			calls.push(['arc', ...args]);
		},
		fill() {
			calls.push(['fill']);
		},
		fillRect(...args) {
			assertFiniteCoordinates(args);
			calls.push(['fillRect', ...args]);
		},
		measureText(value) {
			return {width: String(value).length * 7};
		},
		moveTo(...args) {
			assertFiniteCoordinates(args);
			calls.push(['moveTo', ...args]);
		},
		lineTo(...args) {
			assertFiniteCoordinates(args);
			calls.push(['lineTo', ...args]);
		},
		stroke() {
			calls.push(['stroke']);
		},
		clearRect(...args) {
			assertFiniteCoordinates(args);
			calls.push(['clearRect', ...args]);
		},
		fillText(...args) {
			assertFiniteCoordinates(args.slice(1));
			calls.push(['fillText', ...args]);
		}
	};
}

function createHarness(options) {
	options = options || {};
	const coreCode = fs.readFileSync(path.join(__dirname, '..', 'chart-core.js'), 'utf8');
	const drawCode = fs.readFileSync(path.join(__dirname, '..', 'draw.js'), 'utf8');
	const ctx = createFakeContext();
	const canvas = {
		width: 0,
		height: 0,
		clientWidth: options.clientWidth || 500,
		clientHeight: options.clientHeight || 300,
		style: {},
		toDataURL(type) {
			return 'data:' + (type || 'image/png') + ';base64,FAKE';
		},
		getContext(type) {
			assert.strictEqual(type, '2d');
			return ctx;
		}
	};
	const modules = {};
	let drawModule;
	let loadingModule = null;

	const sandbox = {
		define(deps, factory) {
			assert(Array.isArray(deps));
			const resolvedDeps = deps.map(function(dep) {
				assert(dep in modules, 'missing AMD dependency: ' + dep);
				return modules[dep];
			});
			const exported = factory.apply(null, resolvedDeps);

			if (loadingModule === 'chart-core') {
				modules['./chart-core'] = exported;
				modules['chart-core'] = exported;
			}
			else if (loadingModule === 'draw') {
				drawModule = exported;
			}
		},
		document: {
			getElementById(id) {
				assert.strictEqual(id, 'canvas');
				return canvas;
			}
		},
		window: {
			devicePixelRatio: options.devicePixelRatio || 1,
			getComputedStyle() {
				return {
					getPropertyValue(name) {
						return {
							'font-size': '12px',
							'font-family': 'sans-serif',
							'font-style': 'normal',
							'color': '#000000'
						}[name] || '';
					}
				};
			}
		},
		console
	};

	vm.createContext(sandbox);
	loadingModule = 'chart-core';
	vm.runInContext(coreCode, sandbox, {filename: 'chart-core.js'});
	loadingModule = 'draw';
	vm.runInContext(drawCode, sandbox, {filename: 'draw.js'});

	return {drawModule, ctx, canvas};
}

function assertFinitePlot(chart) {
	for (let key of ['x0', 'y0', 'xn', 'yn']) {
		assert(Number.isFinite(chart.plotWin[key]), 'plotWin.' + key + ' should be finite');
	}

	for (let x of chart.plot.x) {
		assert(Number.isFinite(x), 'plot x coordinate should be finite');
	}

	for (let line of chart.plot.y) {
		for (let y of line) {
			assert(y === null || Number.isFinite(y), 'plot y coordinate should be finite or null');
		}
	}
}

function runTest(name, test) {
	try {
		test();
		console.log('ok - ' + name);
	}
	catch (error) {
		console.error('not ok - ' + name);
		console.error(error && error.stack ? error.stack : error);
		process.exitCode = 1;
	}
}

runTest('constructor uses the resolved element instead of a global canvas', function() {
	const {drawModule, canvas} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	assert.strictEqual(chart.canvas, canvas);
	assert.strictEqual(canvas.width, 500);
	assert.strictEqual(canvas.height, 300);
	assert.strictEqual(canvas.style.width, '500px');
	assert.strictEqual(canvas.style.height, '300px');
});

runTest('constructor accepts a canvas element directly for Shadow DOM use', function() {
	const {drawModule, canvas} = createHarness();
	const chart = drawModule.create(canvas, 400, 240);

	assert.strictEqual(chart.canvas, canvas);
	assert.strictEqual(chart.win.x, 400);
	assert.strictEqual(chart.win.y, 240);
});

runTest('init does not mutate input data or legend objects', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);
	const data = [7];
	const legend = {text: 'rx', color: 'green'};

	chart.init(['a', 'b', 'c'], [{data, legend}], {text: 'Traffic'});

	assert.deepStrictEqual(data, [7]);
	assert.deepStrictEqual(legend, {text: 'rx', color: 'green'});
	assert.deepStrictEqual(chart.y[0].data, [0, 0, 7]);
});

runTest('series without legends can still render axes and graph', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [{data: [1, 2]}], {text: ''});
	assertFinitePlot(chart);

	chart.clear();
	chart.axis();
	chart.pointsOnAxis();
	chart.legend();
	chart.graph();
});

runTest('single-point series produces finite coordinates and a visible point', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a'], [{data: [5], legend: {text: 'one', color: 'red'}}], {text: ''});
	assertFinitePlot(chart);
	chart.graph();

	assert(ctx.calls.some(function(call) { return call[0] === 'arc'; }), 'single point should be drawn with an arc');
});

runTest('empty series collection uses a stable empty chart state', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [], {text: ''});
	assertFinitePlot(chart);
	assert.strictEqual(chart.miny, 0);
	assert.strictEqual(chart.maxy, 1);

	chart.axis();
	chart.pointsOnAxis();
	chart.legend();
	chart.graph();
});

runTest('repeated init calls replace computed state instead of accumulating it', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [
		{data: [1, 2], legend: {text: 'rx'}},
		{data: [3, 4], legend: {text: 'tx'}}
	], {text: 'First'});

	chart.init(['c'], [
		{data: [5], legend: {text: 'rx'}}
	], {text: 'Second'});

	assert.strictEqual(chart.legendData.lines.length, 1);
	assert.strictEqual(chart.plot.x.length, 1);
	assert.strictEqual(chart.plot.y.length, 1);
});

runTest('longer series are aligned to the latest labels', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['newer-1', 'newer-2'], [
		{data: [1, 2, 3, 4], legend: {text: 'rx'}}
	], {text: ''});

	assert.deepStrictEqual(chart.y[0].data, [3, 4]);
});

runTest('append adds live samples and respects maxPoints', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init([], [
		{legend: {id: 'rx', text: 'rx', color: 'green'}},
		{legend: {id: 'tx', text: 'tx', color: 'blue'}}
	], {text: 'Traffic'}, {maxPoints: 2});

	chart.append('00:01', {rx: 10, tx: 20});
	chart.append('00:02', {rx: 30, tx: 40});
	chart.append('00:03', {rx: 50, tx: 60});

	assert.deepStrictEqual(plain(chart.x), ['00:02', '00:03']);
	assert.deepStrictEqual(plain(chart.y[0].data), [30, 50]);
	assert.deepStrictEqual(plain(chart.y[1].data), [40, 60]);
	assertFinitePlot(chart);
});

runTest('append can render immediately when requested', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init([], [
		{legend: {id: 'rx', text: 'rx', color: 'green'}}
	], {text: 'Traffic'}, {maxPoints: 3});
	chart.append('00:01', {rx: 10}, {render: true});

	assert(ctx.calls.some(function(call) { return call[0] === 'clearRect'; }), 'render should clear the canvas');
	assert(ctx.calls.some(function(call) { return call[0] === 'fillText' && call[1] === 'Traffic'; }), 'render should draw the title');
});

runTest('HiDPI canvas uses physical pixels while preserving logical dimensions', function() {
	const {drawModule, ctx, canvas} = createHarness({devicePixelRatio: 2});
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	assert.strictEqual(chart.pixelRatio, 2);
	assert.strictEqual(canvas.width, 1000);
	assert.strictEqual(canvas.height, 600);
	assert.strictEqual(canvas.style.width, '500px');
	assert.strictEqual(canvas.style.height, '300px');
	assert(ctx.calls.some(function(call) {
		return call[0] === 'setTransform' && call[1] === 2 && call[4] === 2;
	}), 'canvas context should be scaled to the device pixel ratio');
});

runTest('resize updates logical dimensions, recomputes model and can render', function() {
	const {drawModule, ctx, canvas} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [{data: [1, 2], legend: {text: 'rx'}}], {text: 'Traffic'});
	chart.resize(320, 180, {render: true});

	assert.strictEqual(chart.win.x, 320);
	assert.strictEqual(chart.win.y, 180);
	assert.strictEqual(canvas.width, 320);
	assert.strictEqual(canvas.height, 180);
	assert.strictEqual(canvas.style.width, '320px');
	assert.strictEqual(canvas.style.height, '180px');
	assert(ctx.calls.some(function(call) { return call[0] === 'clearRect'; }), 'resize render should clear canvas');
	assertFinitePlot(chart);
});

runTest('render draws formatted ticks and threshold lines', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init([0, 1], [
		{data: [10, 20], legend: {id: 'rx', text: 'rx', color: 'green'}}
	], {text: 'Traffic'}, {
		yMin: 0,
		yMax: 20,
		yTickCount: 2,
		yUnit: '%',
		thresholds: [{value: 15, label: 'warn', color: 'orange'}]
	});
	chart.render();

	assert(ctx.calls.some(function(call) { return call[0] === 'fillText' && call[1] === '0%'; }), 'render should draw formatted y tick labels');
	assert(ctx.calls.some(function(call) { return call[0] === 'fillText' && call[1] === '20%'; }), 'render should draw formatted y tick labels');
	assert(ctx.calls.some(function(call) { return call[0] === 'fillText' && call[1] === 'warn'; }), 'render should draw threshold labels');
});

runTest('render draws grid lines when grid is enabled', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [{data: [1, 2], legend: {text: 'rx'}}], {text: ''}, {
		grid: {x: true, y: true, color: '#dddddd'}
	});
	chart.render();

	assert.strictEqual(chart.grid.x, true);
	assert.strictEqual(chart.grid.y, true);
	assert(ctx.calls.some(function(call) {
		return call[0] === 'lineTo' && call[1] === chart.plotWin.xn;
	}), 'grid rendering should draw horizontal lines');
});

runTest('toggleSeries hides a series from graph rendering', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [
		{data: [1, 2], legend: {id: 'rx', text: 'rx', color: 'green'}}
	], {text: ''});
	chart.toggleSeries('rx', false);
	ctx.calls.length = 0;
	chart.graph();

	assert.strictEqual(chart.isSeriesHidden(0), true);
	assert(!ctx.calls.some(function(call) { return call[0] === 'lineTo'; }), 'hidden series should not draw line segments');
});

runTest('cursorAt returns nearest point and render draws tooltip', function() {
	const {drawModule, ctx} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a', 'b'], [
		{data: [1, 2], legend: {id: 'rx', text: 'rx', color: 'green'}}
	], {text: ''}, {
		cursor: {snapRadius: 40}
	});
	const point = chart.cursorAt(chart.plot.x[1], chart.plot.y[0][1], {render: true});

	assert(point);
	assert.strictEqual(point.index, 1);
	assert.strictEqual(point.value, 2);
	assert(ctx.calls.some(function(call) {
		return call[0] === 'fillText' && String(call[1]).indexOf('b:') === 0;
	}), 'cursor render should draw tooltip text');
});

runTest('appendMany batches samples and respects maxPoints', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init([], [{legend: {id: 'rx', text: 'rx'}}], {text: ''}, {maxPoints: 3});
	chart.appendMany([
		{label: 'a', values: {rx: 1}},
		{label: 'b', values: {rx: 2}},
		{label: 'c', values: {rx: 3}},
		{label: 'd', values: {rx: 4}}
	]);

	assert.deepStrictEqual(plain(chart.x), ['b', 'c', 'd']);
	assert.deepStrictEqual(plain(chart.y[0].data), [2, 3, 4]);
});

runTest('pause queues samples until resume flushes them', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init([], [{legend: {id: 'rx', text: 'rx'}}], {text: ''}, {maxPoints: 3});
	chart.pause();
	chart.append('a', {rx: 1});
	chart.append('b', {rx: 2});

	assert.strictEqual(chart.isPaused(), true);
	assert.strictEqual(chart.pendingSamples.length, 2);
	assert.deepStrictEqual(plain(chart.x), []);

	chart.resume();
	assert.strictEqual(chart.isPaused(), false);
	assert.strictEqual(chart.pendingSamples.length, 0);
	assert.deepStrictEqual(plain(chart.x), ['a', 'b']);
});

runTest('export APIs return JSON, CSV and image data', function() {
	const {drawModule} = createHarness();
	const chart = drawModule.create(() => 'canvas', () => 500, () => 300);

	chart.init(['a,b', 'c'], [
		{data: [1, 2], legend: {id: 'rx', text: 'rx'}}
	], {text: 'Traffic'});

	assert.deepStrictEqual(plain(chart.toJSON().labels), ['a,b', 'c']);
	assert.strictEqual(chart.toCSV(), 'label,rx\n"a,b",1\nc,2');
	assert.strictEqual(chart.toImage('image/jpeg'), 'data:image/jpeg;base64,FAKE');
});
