'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function read(file) {
	return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
	fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
	fs.writeFileSync(path.join(root, file), content);
}

function parseAmd(source, header) {
	source = source.trimEnd();

	if (!source.startsWith(header)) {
		throw new Error('Unexpected AMD header');
	}

	let body = source.slice(header.length);
	let footer = '\n});';
	if (!body.endsWith(footer)) {
		throw new Error('Unexpected AMD footer');
	}

	body = body.slice(0, -footer.length);
	let marker = '\n\treturn {\n';
	let markerIndex = body.lastIndexOf(marker);

	if (markerIndex === -1) {
		throw new Error('Cannot find AMD return object');
	}

	let implementation = body.slice(0, markerIndex);
	let exportsBlock = body.slice(markerIndex + marker.length);
	let endMarker = '\n\t};';

	if (!exportsBlock.endsWith(endMarker)) {
		throw new Error('Cannot parse AMD return object');
	}

	exportsBlock = exportsBlock.slice(0, -endMarker.length);

	return {implementation, exportsBlock};
}

function exportNames(exportsBlock) {
	return exportsBlock
		.split('\n')
		.map(function(line) {
			let match = line.match(/^\t\t([A-Za-z0-9_$]+):/);
			return match ? match[1] : null;
		})
		.filter(Boolean);
}

function buildModule(options) {
	const parsed = parseAmd(read(options.source), options.header);
	const names = exportNames(parsed.exportsBlock);
	const importLine = options.esmImport ? options.esmImport + '\n' : '';
	const requireLine = options.cjsRequire ? options.cjsRequire + '\n' : '';
	const objectLiteral = '{\n' + parsed.exportsBlock + '\n}';

	write(options.esmTarget, [
		importLine + parsed.implementation.trimEnd(),
		'const __exports = ' + objectLiteral + ';',
		names.map(function(name) {
			return 'const __export_' + name + ' = __exports.' + name + ';';
		}).join('\n'),
		'export {\n' + names.map(function(name) {
			return '\t__export_' + name + ' as ' + name;
		}).join(',\n') + '\n};',
		'export default __exports;',
		''
	].join('\n\n'));

	write(options.cjsTarget, [
		"'use strict';",
		requireLine + parsed.implementation.trimEnd(),
		'const __exports = ' + objectLiteral + ';',
		'module.exports = __exports;',
		''
	].join('\n\n'));
}

function buildTypes() {
	write('dist/index.d.ts', `export interface Legend {
	id?: string;
	text?: string;
	color?: string;
}

export interface Series {
	data?: Array<number | string | null | undefined>;
	legend?: Legend;
}

export interface Threshold {
	value: number;
	label?: string;
	color?: string;
	lineWidth?: number;
}

export interface ChartOptions {
	maxPoints?: number;
	yMin?: number;
	yMax?: number;
	yPadding?: number;
	yTickCount?: number;
	yUnit?: string;
	xFormatter?: (value: unknown, index: number) => string;
	yFormatter?: (value: number, index: number) => string;
	thresholds?: Threshold[];
}

export interface Head {
	text?: string;
}

export interface DataSet {
	labels: unknown[];
	series: Array<{data: Array<number | null>; legend: Legend}>;
	head: Head;
	maxPoints: number | null;
	options: ChartOptions;
}

export interface PlotWindow {
	x0: number;
	y0: number;
	xn: number;
	yn: number;
}

export interface PlotModel {
	x: number[];
	n: number;
	y: Array<Array<number | null>>;
	hx: number;
	hy: number;
}

export interface ChartModel {
	x: unknown[];
	y: Array<{data: Array<number | null>}>;
	miny: number;
	maxy: number;
	plotWin: PlotWindow;
	plot: PlotModel;
	legendData: {
		head: {text: string; x: number; y: number};
		lines: Array<Legend & {x?: number; y?: number; r?: number}>;
	};
	options: ChartOptions;
	thresholds: Array<Threshold & {y: number; label: string}>;
	xLabels: string[];
	yTicks: Array<{value: number; label: string; y: number}>;
}

export interface Chart {
	init(labels: unknown[], series: Series[], head?: Head, options?: ChartOptions | number): Chart;
	append(label: unknown, values: Array<number | string | null | undefined> | Record<string, number | string | null | undefined>, options?: ChartOptions & {render?: boolean}): Chart;
	render(): Chart;
	resize(width?: number, height?: number, options?: {render?: boolean}): Chart;
	clear(...params: number[]): void;
	axis(color?: string, lineWidth?: number): void;
	pointsOnAxis(lineWidth?: number, filterx?: number, filtery?: number, color?: string): void;
	legend(color?: string): void;
	graph(lineWidth?: number, color?: string): void;
	setFont(font: Record<string, unknown>): void;
}

export function create(canvasId: string | (() => string), width?: number | (() => number), height?: number | (() => number)): Chart;
export function createDataSet(labels: unknown[], series: Series[], head?: Head, options?: ChartOptions | number): DataSet;
export function appendSample(dataSet: DataSet | null, label: unknown, values: unknown, options?: ChartOptions | number): DataSet;
export function createModel(options: {labels?: unknown[]; series?: Series[]; head?: Head; dataSet?: DataSet; width?: number; height?: number; fontPx?: number; measureText?: (text: string) => {width: number}} & ChartOptions): ChartModel;
export function formatTick(value: unknown): string;

declare const _default: {
	create: typeof create;
};

export default _default;
`);

	write('dist/web-component.d.ts', `import type {ChartOptions, Head, Series} from './index.d.ts';

export class TimeSeriesChartElement extends HTMLElement {
	chart: unknown;
	setData(labels: unknown[], series: Series[], head?: Head, options?: ChartOptions): void;
	append(label: unknown, values: Array<number | string | null | undefined> | Record<string, number | string | null | undefined>, options?: ChartOptions): void;
	render(): void;
}

export function defineTimeSeriesChart(tagName?: string): CustomElementConstructor;
`);

	write('dist/adapters.d.ts', `import type {ChartOptions, Head, Series} from './index.d.ts';

export interface Sample {
	label: unknown;
	values: Array<number | string | null | undefined> | Record<string, number | string | null | undefined>;
	options?: ChartOptions;
}

export function createReactTimeSeriesChart(React: any, tagName?: string): any;
export function createVueTimeSeriesChart(Vue: any, tagName?: string): any;
export function timeSeriesChart(node: HTMLElement & {setData?: Function}, options?: {
	labels?: unknown[];
	series?: Series[];
	head?: Head;
	options?: ChartOptions;
	samples?: Sample[];
}): {update(nextOptions?: unknown): void; destroy(): void};
`);
}

fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});

buildModule({
	source: 'chart-core.js',
	header: "define([], function() {\n\t'use strict';\n\n",
	esmTarget: 'dist/chart-core.mjs',
	cjsTarget: 'dist/chart-core.cjs'
});

buildModule({
	source: 'draw.js',
	header: "define(['./chart-core'], function(core) {\n\t'use strict';\n\n",
	esmImport: "import * as core from './chart-core.mjs';",
	cjsRequire: "const core = require('./chart-core.cjs');",
	esmTarget: 'dist/draw.mjs',
	cjsTarget: 'dist/draw.cjs'
});

buildTypes();
console.log('Built modern package files in dist/');
