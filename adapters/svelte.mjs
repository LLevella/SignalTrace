import '../web-component.mjs';

export function timeSeriesChart(node, options = {}) {
	function apply(nextOptions) {
		const labels = nextOptions.labels || [];
		const series = nextOptions.series || [];
		const head = nextOptions.head || {};
		const chartOptions = nextOptions.options || {};

		node.setData(labels, series, head, chartOptions);
	}

	apply(options);

	return {
		update(nextOptions) {
			apply(nextOptions || {});
		},
		destroy() {}
	};
}
