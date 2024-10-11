define([], function() {
	'use strict';

	function resolveValue(value) {
		return typeof value === 'function' ? value() : value;
	}

	function toPositiveNumber(value, fallback) {
		let number = Number(resolveValue(value));
		return Number.isFinite(number) && number > 0 ? number : fallback;
	}

	function toFiniteNumber(value) {
		if (value === null || value === undefined || value === "") {
			return null;
		}

		let number = Number(value);
		return Number.isFinite(number) ? number : null;
	}

	function formatTick(value) {
		let number = Number(value);

		if (!Number.isFinite(number)) {
			return "";
		}

		return Number.isInteger(number) ? number + "" : Number(number.toFixed(2)) + "";
	}

	function measureValue(measureText, value) {
		let text = String(value === undefined || value === null ? "" : value);
		let measured = typeof measureText === 'function' ? measureText(text) : null;
		let width = measured && Number.isFinite(measured.width) ? measured.width : text.length * 7;

		return {width: width};
	}

	function normalizeLabels(labels, series) {
		let normalizedLabels = Array.isArray(labels) ? labels.slice() : [];

		if (normalizedLabels.length === 0 && Array.isArray(series) && series.length > 0) {
			let maxLength = 0;
			for (let item of series) {
				if (item && Array.isArray(item.data)) {
					maxLength = Math.max(maxLength, item.data.length);
				}
			}

			normalizedLabels = Array.from({length: maxLength}, function(_, index) {
				return index;
			});
		}

		return normalizedLabels;
	}

	function normalizeSeriesData(data, targetLength) {
		let normalized = Array.isArray(data) ? data.slice() : [];

		if (targetLength === 0) {
			return [];
		}

		if (normalized.length > targetLength) {
			normalized = normalized.slice(normalized.length - targetLength);
		}

		while (normalized.length < targetLength) {
			normalized.unshift(0);
		}

		return normalized.map(toFiniteNumber);
	}

	function normalizeMaxPoints(value) {
		let number = Number(resolveValue(value));
		return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
	}

	function readMaxPoints(options, fallback) {
		let fallbackValue = normalizeMaxPoints(fallback);

		if (options === undefined || options === null) {
			return fallbackValue;
		}

		if (typeof options === 'object' && !Array.isArray(options)) {
			if ('maxPoints' in options) {
				return normalizeMaxPoints(options.maxPoints);
			}

			return fallbackValue;
		}

		return normalizeMaxPoints(options);
	}

	function limitArray(items, maxPoints) {
		let limited = Array.isArray(items) ? items.slice() : [];

		if (maxPoints !== null && limited.length > maxPoints) {
			return limited.slice(limited.length - maxPoints);
		}

		return limited;
	}

	function cloneLegend(legend) {
		return Object.assign({}, legend || {});
	}

	function cloneHead(head) {
		return Object.assign({}, head || {});
	}

	function createDataSet(labels, series, head, options) {
		let rawSeries = Array.isArray(series) ? series : [];
		let maxPoints = readMaxPoints(options, null);
		let normalizedLabels = limitArray(normalizeLabels(labels, rawSeries), maxPoints);
		let normalizedSeries = [];

		for (let item of rawSeries) {
			let source = item || {};
			normalizedSeries.push({
				data: normalizeSeriesData(source.data, normalizedLabels.length),
				legend: cloneLegend(source.legend)
			});
		}

		return {
			labels: normalizedLabels,
			series: normalizedSeries,
			head: cloneHead(head),
			maxPoints: maxPoints
		};
	}

	function getSeriesKey(series, index) {
		let legend = series && series.legend ? series.legend : {};

		if (legend.id !== undefined && legend.id !== null) {
			return String(legend.id);
		}

		if (legend.text !== undefined && legend.text !== null) {
			return String(legend.text);
		}

		return String(index);
	}

	function inferSeriesFromValues(values) {
		if (Array.isArray(values)) {
			return values.map(function(_, index) {
				return {data: [], legend: {id: String(index), text: String(index)}};
			});
		}

		if (values && typeof values === 'object') {
			return Object.keys(values).map(function(key) {
				return {data: [], legend: {id: key, text: key}};
			});
		}

		return [{data: [], legend: {id: 'value', text: 'value'}}];
	}

	function hasOwnValue(values, key) {
		return values && Object.prototype.hasOwnProperty.call(values, key);
	}

	function getAppendValue(values, series, index) {
		if (Array.isArray(values)) {
			return values[index];
		}

		if (values && typeof values === 'object') {
			let key = getSeriesKey(series, index);
			let legend = series && series.legend ? series.legend : {};

			if (hasOwnValue(values, key)) {
				return values[key];
			}

			if (legend.text !== undefined && hasOwnValue(values, String(legend.text))) {
				return values[String(legend.text)];
			}

			if (hasOwnValue(values, String(index))) {
				return values[String(index)];
			}

			return null;
		}

		return index === 0 ? values : null;
	}

	function appendSample(dataSet, label, values, options) {
		dataSet = dataSet || createDataSet([], [], {}, null);

		let maxPoints = readMaxPoints(options, dataSet.maxPoints);
		let current = createDataSet(dataSet.labels, dataSet.series, dataSet.head, {maxPoints: maxPoints});
		let series = current.series.length > 0 ? current.series : inferSeriesFromValues(values);
		let labels = limitArray(current.labels.concat([label]), maxPoints);
		let appendedSeries = [];

		for (let i = 0; i < series.length; i++) {
			let source = series[i] || {};
			let data = Array.isArray(source.data) ? source.data.slice() : [];
			data.push(getAppendValue(values, source, i));
			data = normalizeSeriesData(limitArray(data, maxPoints), labels.length);

			appendedSeries.push({
				data: data,
				legend: cloneLegend(source.legend)
			});
		}

		return {
			labels: labels,
			series: appendedSeries,
			head: cloneHead(current.head),
			maxPoints: maxPoints
		};
	}

	function createEmptyState() {
		return {
			x: [],
			y: [],
			miny: 0,
			maxy: 0,
			plotWin: {x0: 0, y0: 0, xn: 0, yn: 0},
			plot: {x: [], n: 0, y: [], hx: 0, hy: 0},
			legendData: {
				head: {text: "", x: 0, y: 0},
				lines: []
			},
			minXTextSize: {width: 0},
			maxXTextSize: {width: 0},
			maxYTextSize: {width: 0}
		};
	}

	function createPlotModel(labels, series, plotWin, miny, maxy) {
		labels = Array.isArray(labels) ? labels : [];
		series = Array.isArray(series) ? series : [];
		plotWin = plotWin || {x0: 0, y0: 0, xn: 0, yn: 0};

		let plot = {x: [], n: 0, y: [], hx: 0, hy: 0};
		let count = labels.length;

		if (count === 0) {
			return plot;
		}

		let plotdx = Math.max(0, plotWin.xn - plotWin.x0);
		let plotdy = Math.max(0, plotWin.yn - plotWin.y0);
		let steps = Math.max(count - 1, 1);
		let dy = maxy - miny;

		plot.hx = count > 1 ? plotdx / steps : 0;
		plot.hy = count > 1 ? plotdy / steps : plotdy;

		for (let i = 0; i < count; i++) {
			let xi = count === 1
				? plotWin.x0 + plotdx / 2
				: plotWin.x0 + i * plot.hx;
			plot.x.push(xi);
		}

		for (let yi of series) {
			let ploty = [];
			let values = yi && Array.isArray(yi.data) ? yi.data : [];

			for (let yidata of values) {
				if (yidata === null) {
					ploty.push(null);
					continue;
				}

				let ratio = dy === 0 ? 0.5 : (yidata - miny) / dy;
				ploty.push(plotWin.yn - plotdy * ratio);
			}

			plot.y.push(ploty);
		}

		plot.n = count;
		return plot;
	}

	function createModel(options) {
		options = options || {};

		let state = createEmptyState();
		let dataSet = options.dataSet || createDataSet(options.labels, options.series, options.head, {
			maxPoints: options.maxPoints
		});
		let series = Array.isArray(dataSet.series) ? dataSet.series : [];
		let labels = Array.isArray(dataSet.labels) ? dataSet.labels : [];
		let width = toPositiveNumber(options.width, 300);
		let height = toPositiveNumber(options.height, 150);
		let fontPx = toPositiveNumber(options.fontPx, 12);
		let measureText = options.measureText;

		state.x = labels;
		state.minXTextSize = measureValue(measureText, labels[0]);
		state.maxXTextSize = measureValue(measureText, labels[labels.length - 1]);

		let finiteValues = [];

		for (let i = 0; i < series.length; i++) {
			let source = series[i] || {};
			let line = Object.assign({}, source.legend || {});

			if (line.text !== undefined) {
				line.text = String(line.text);
				line.y = fontPx * (i + 2);
				line.x = Math.round((width - measureValue(measureText, line.text).width) / 2);
				line.r = Math.max(1, (fontPx - 2) / 2);
			}

			state.legendData.lines.push(line);

			let ydata = normalizeSeriesData(source.data, labels.length);
			for (let value of ydata) {
				if (value !== null) {
					finiteValues.push(value);
				}
			}

			state.y.push({data: ydata});
		}

		if (finiteValues.length > 0) {
			state.maxy = Math.max.apply(null, finiteValues);
			state.miny = Math.min.apply(null, finiteValues);
		}
		else {
			state.maxy = 1;
			state.miny = 0;
		}

		let minYTextSize = measureValue(measureText, formatTick(state.miny));
		let maxYTextSize = measureValue(measureText, formatTick(state.maxy));
		state.maxYTextSize = minYTextSize.width > maxYTextSize.width ? minYTextSize : maxYTextSize;

		let head = dataSet.head || {};
		let headText = head.text !== undefined ? String(head.text) : "";
		if (headText.length > 0) {
			state.legendData.head.text = headText;
			state.legendData.head.x = Math.round((width - measureValue(measureText, headText).width) / 2);
			state.legendData.head.y = fontPx;
		}

		let legendBottom = state.legendData.head.text ? state.legendData.head.y + fontPx : 0;
		for (let line of state.legendData.lines) {
			if (line.text !== undefined) {
				legendBottom = Math.max(legendBottom, line.y + fontPx);
			}
		}

		state.plotWin.y0 = Math.max(fontPx, legendBottom + fontPx);
		state.plotWin.x0 = Math.max(state.maxYTextSize.width, state.maxXTextSize.width) + fontPx;
		state.plotWin.xn = Math.max(state.plotWin.x0, width - state.minXTextSize.width);
		state.plotWin.yn = Math.max(state.plotWin.y0, height - 2 * fontPx);
		state.plot = createPlotModel(state.x, state.y, state.plotWin, state.miny, state.maxy);

		return state;
	}

	return {
		appendSample: appendSample,
		createDataSet: createDataSet,
		createEmptyState: createEmptyState,
		createModel: createModel,
		createPlotModel: createPlotModel,
		formatTick: formatTick,
		getSeriesKey: getSeriesKey,
		normalizeLabels: normalizeLabels,
		normalizeMaxPoints: normalizeMaxPoints,
		normalizeSeriesData: normalizeSeriesData,
		readMaxPoints: readMaxPoints,
		resolveValue: resolveValue,
		toFiniteNumber: toFiniteNumber,
		toPositiveNumber: toPositiveNumber
	};
});
