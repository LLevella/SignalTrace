import '../web-component.mjs';

export function createVueTimeSeriesChart(Vue, tagName = 'time-series-chart') {
	return {
		name: 'TimeSeriesChart',
		props: {
			head: {type: Object, default: function() { return {}; }},
			labels: {type: Array, default: function() { return []; }},
			options: {type: Object, default: function() { return {}; }},
			series: {type: Array, default: function() { return []; }}
		},
		mounted() {
			this.$el.setData(this.labels, this.series, this.head, this.options);
		},
		watch: {
			head: 'updateChart',
			labels: 'updateChart',
			options: 'updateChart',
			series: 'updateChart'
		},
		methods: {
			append(label, values, options) {
				this.$el.append(label, values, options);
			},
			updateChart() {
				this.$el.setData(this.labels, this.series, this.head, this.options);
			}
		},
		render() {
			return Vue.h(tagName);
		}
	};
}
