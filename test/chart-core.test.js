'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function plain(value) {
	return JSON.parse(JSON.stringify(value));
}

function loadCore() {
	const code = fs.readFileSync(path.join(__dirname, '..', 'chart-core.js'), 'utf8');
	let chartCore;
	const sandbox = {
		define(deps, factory) {
			assert(Array.isArray(deps));
			assert.strictEqual(deps.length, 0);
			chartCore = factory();
		}
	};

	vm.createContext(sandbox);
	vm.runInContext(code, sandbox, {filename: 'chart-core.js'});
	return chartCore;
}

function assertFinitePlot(model) {
	for (let key of ['x0', 'y0', 'xn', 'yn']) {
		assert(Number.isFinite(model.plotWin[key]), 'plotWin.' + key + ' should be finite');
	}

	for (let x of model.plot.x) {
		assert(Number.isFinite(x), 'plot x coordinate should be finite');
	}

	for (let line of model.plot.y) {
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

runTest('normalizeSeriesData pads short series without mutating input', function() {
	const core = loadCore();
	const source = [7];
	const result = core.normalizeSeriesData(source, 3);

	assert.deepStrictEqual(source, [7]);
	assert.deepStrictEqual(plain(result), [0, 0, 7]);
});

runTest('formatTick handles integer, decimal and invalid values', function() {
	const core = loadCore();

	assert.strictEqual(core.formatTick(5), '5');
	assert.strictEqual(core.formatTick(5.126), '5.13');
	assert.strictEqual(core.formatTick(NaN), '');
});

runTest('normalizeSeriesData trims long series to latest points and keeps gaps', function() {
	const core = loadCore();
	const source = [1, null, '5', 'bad'];
	const result = core.normalizeSeriesData(source, 3);

	assert.deepStrictEqual(source, [1, null, '5', 'bad']);
	assert.deepStrictEqual(plain(result), [null, 5, null]);
});

runTest('createModel builds labels from series when labels are missing', function() {
	const core = loadCore();
	const model = core.createModel({
		labels: [],
		series: [{data: [1, 2, 3]}],
		width: 500,
		height: 300,
		fontPx: 12
	});

	assert.deepStrictEqual(plain(model.x), [0, 1, 2]);
	assert.strictEqual(model.plot.n, 3);
	assertFinitePlot(model);
});

runTest('createModel does not mutate source series or legends', function() {
	const core = loadCore();
	const data = [1, 2, 3];
	const legend = {text: 'rx', color: 'green'};
	const model = core.createModel({
		labels: ['newer-1', 'newer-2'],
		series: [{data, legend}],
		head: {text: 'Traffic'},
		width: 500,
		height: 300,
		fontPx: 12,
		measureText(value) {
			return {width: String(value).length * 7};
		}
	});

	assert.deepStrictEqual(data, [1, 2, 3]);
	assert.deepStrictEqual(legend, {text: 'rx', color: 'green'});
	assert.deepStrictEqual(plain(model.y[0].data), [2, 3]);
	assert.strictEqual(model.legendData.lines[0].text, 'rx');
	assert.strictEqual(model.legendData.head.text, 'Traffic');
	assertFinitePlot(model);
});

runTest('createModel keeps invalid values as plot gaps', function() {
	const core = loadCore();
	const model = core.createModel({
		labels: ['a', 'b', 'c'],
		series: [{data: [1, null, 3]}],
		width: 500,
		height: 300,
		fontPx: 12
	});

	assert.deepStrictEqual(plain(model.y[0].data), [1, null, 3]);
	assert.strictEqual(model.plot.y[0][1], null);
	assertFinitePlot(model);
});

runTest('createDataSet applies maxPoints to labels and series data', function() {
	const core = loadCore();
	const dataSet = core.createDataSet(['a', 'b', 'c', 'd'], [
		{data: [1, 2, 3, 4], legend: {id: 'rx', text: 'rx'}}
	], {text: 'Traffic'}, {maxPoints: 2});

	assert.deepStrictEqual(plain(dataSet.labels), ['c', 'd']);
	assert.deepStrictEqual(plain(dataSet.series[0].data), [3, 4]);
	assert.strictEqual(dataSet.maxPoints, 2);
});

runTest('appendSample appends object values by series id and keeps maxPoints', function() {
	const core = loadCore();
	let dataSet = core.createDataSet(['a', 'b'], [
		{data: [1, 2], legend: {id: 'rx', text: 'RX'}},
		{data: [10, 20], legend: {id: 'tx', text: 'TX'}}
	], {text: 'Traffic'}, {maxPoints: 3});

	dataSet = core.appendSample(dataSet, 'c', {rx: 3, tx: 30});
	dataSet = core.appendSample(dataSet, 'd', {rx: 4, tx: 40});

	assert.deepStrictEqual(plain(dataSet.labels), ['b', 'c', 'd']);
	assert.deepStrictEqual(plain(dataSet.series[0].data), [2, 3, 4]);
	assert.deepStrictEqual(plain(dataSet.series[1].data), [20, 30, 40]);
});

runTest('appendSample infers series from object values when no series exist yet', function() {
	const core = loadCore();
	const dataSet = core.appendSample(null, 'a', {rx: 1, tx: 2}, {maxPoints: 3});

	assert.deepStrictEqual(plain(dataSet.labels), ['a']);
	assert.deepStrictEqual(plain(dataSet.series.map(function(series) {
		return series.legend.id;
	})), ['rx', 'tx']);
	assert.deepStrictEqual(plain(dataSet.series.map(function(series) {
		return series.data[0];
	})), [1, 2]);
});

runTest('single-point plot is finite and centered in the plot window', function() {
	const core = loadCore();
	const model = core.createModel({
		labels: ['only'],
		series: [{data: [5]}],
		width: 500,
		height: 300,
		fontPx: 12
	});
	const centerX = model.plotWin.x0 + (model.plotWin.xn - model.plotWin.x0) / 2;

	assert.strictEqual(model.plot.n, 1);
	assert.strictEqual(model.plot.x[0], centerX);
	assertFinitePlot(model);
});
