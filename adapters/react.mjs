import '../web-component.mjs';

export function createReactTimeSeriesChart(React, tagName = 'time-series-chart') {
	return React.forwardRef(function TimeSeriesChart(props, ref) {
		const elementRef = React.useRef(null);
		const {labels, series, head, options, samples, ...rest} = props;

		React.useImperativeHandle(ref, function() {
			return elementRef.current;
		});

		React.useEffect(function() {
			if (elementRef.current && series) {
				elementRef.current.setData(labels || [], series, head || {}, options || {});
			}
		}, [labels, series, head, options]);

		React.useEffect(function() {
			if (!elementRef.current || !Array.isArray(samples)) {
				return;
			}

			for (const sample of samples) {
				elementRef.current.append(sample.label, sample.values, sample.options);
			}
		}, [samples]);

		return React.createElement(tagName, Object.assign({}, rest, {ref: elementRef}));
	});
}
