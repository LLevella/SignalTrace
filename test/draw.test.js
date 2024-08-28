'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function createHarness() {
	const coreCode = fs.readFileSync(path.join(__dirname, '..', 'chart-core.js'), 'utf8');
	const drawCode = fs.readFileSync(path.join(__dirname, '..', 'draw.js'), 'utf8');
	const ctx = createFakeContext();
	const canvas = {
		width: 0,
		height: 0,
		clientWidth: 500,
		clientHeight: 300,
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
