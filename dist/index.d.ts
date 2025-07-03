export interface Legend {
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
	cursor?: {enabled?: boolean; tooltip?: boolean; snapRadius?: number};
	grid?: {x?: boolean; y?: boolean; color?: string; lineWidth?: number};
	theme?: Record<string, string>;
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
	appendMany(samples: Array<{label: unknown; values: Array<number | string | null | undefined> | Record<string, number | string | null | undefined>; options?: ChartOptions}>, options?: ChartOptions & {render?: boolean; force?: boolean}): Chart;
	pause(): Chart;
	resume(options?: {render?: boolean}): Chart;
	isPaused(): boolean;
	flush(options?: {render?: boolean}): Chart;
	render(): Chart;
	resize(width?: number, height?: number, options?: {render?: boolean}): Chart;
	cursorAt(x: number, y: number, options?: {render?: boolean}): unknown;
	nearestPoint(x: number, y: number): unknown;
	toggleSeries(keyOrIndex: string | number, visible?: boolean): Chart;
	isSeriesHidden(keyOrIndex: string | number): boolean;
	toJSON(): DataSet;
	toCSV(): string;
	toImage(type?: string, quality?: number): string;
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
