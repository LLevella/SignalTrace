import type {ChartOptions, Head, Series} from './index.d.ts';

export class TimeSeriesChartElement extends HTMLElement {
	chart: unknown;
	setData(labels: unknown[], series: Series[], head?: Head, options?: ChartOptions): void;
	append(label: unknown, values: Array<number | string | null | undefined> | Record<string, number | string | null | undefined>, options?: ChartOptions): void;
	render(): void;
}

export function defineTimeSeriesChart(tagName?: string): CustomElementConstructor;
