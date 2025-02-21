import {create} from './dist/draw.mjs';

const template = document.createElement('template');
template.innerHTML = `
	<style>
		:host {
			display: block;
			min-width: 160px;
		}

		canvas {
			display: block;
			width: 100%;
			height: 100%;
		}
	</style>
	<canvas part="canvas"></canvas>
`;

export class TimeSeriesChartElement extends HTMLElement {
	static get observedAttributes() {
		return ['height', 'width', 'max-points'];
	}

	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.shadowRoot.appendChild(template.content.cloneNode(true));
		this.canvas = this.shadowRoot.querySelector('canvas');
		this.chart = null;
		this.labels = [];
		this.series = [];
		this.head = {};
		this.options = {};
	}

	connectedCallback() {
		this.ensureChart();
		this.render();
	}

	attributeChangedCallback() {
		if (!this.isConnected) {
			return;
		}

		this.ensureChart();
		this.chart.resize(this.chartWidth(), this.chartHeight(), {render: true});
	}

	chartWidth() {
		return Number(this.getAttribute('width')) || this.clientWidth || 300;
	}

	chartHeight() {
		return Number(this.getAttribute('height')) || this.clientHeight || 150;
	}

	mergedOptions(extraOptions) {
		return Object.assign({}, this.options, {
			maxPoints: Number(this.getAttribute('max-points')) || this.options.maxPoints
		}, extraOptions || {});
	}

	ensureChart() {
		if (this.chart) {
			return;
		}

		this.chart = create(this.canvas, this.chartWidth(), this.chartHeight());
		this.chart.init(this.labels, this.series, this.head, this.mergedOptions());
	}

	setData(labels, series, head, options) {
		this.labels = Array.isArray(labels) ? labels.slice() : [];
		this.series = Array.isArray(series) ? series : [];
		this.head = head || {};
		this.options = options || {};
		this.ensureChart();
		this.chart.init(this.labels, this.series, this.head, this.mergedOptions());
		this.render();
	}

	append(label, values, options) {
		this.ensureChart();
		this.chart.append(label, values, this.mergedOptions(options));
		this.render();
	}

	render() {
		if (this.chart) {
			this.chart.render();
		}
	}
}

export function defineTimeSeriesChart(tagName = 'time-series-chart') {
	if (!customElements.get(tagName)) {
		customElements.define(tagName, TimeSeriesChartElement);
	}

	return customElements.get(tagName);
}

if (typeof customElements !== 'undefined') {
	defineTimeSeriesChart();
}
