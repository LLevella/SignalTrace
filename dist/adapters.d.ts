import type {ChartOptions, Head, Series} from './index.d.ts';

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
