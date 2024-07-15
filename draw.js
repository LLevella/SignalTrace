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
		let number = Number(value);
		return Number.isFinite(number) ? number : null;
	}

	function formatTick(value) {
		return Number.isInteger(value) ? value + "" : Number(value.toFixed(2)) + "";
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

	// ---------------------------------------------------------------------------------
	class draw {
		constructor(koCanvas, koWidth, koHeight) {
			this.win = {x: 0, y: 0};
			this.plotWin = {x0: 0, y0: 0, xn: 0, yn: 0};

			let canvasId = resolveValue(koCanvas);
			this.canvas = document.getElementById(canvasId);

			if (!this.canvas) {
				throw new Error("Canvas element not found: " + canvasId);
			}

			this.ctx = this.canvas.getContext && this.canvas.getContext('2d');

			if (!this.ctx) {
				throw new Error("Canvas 2D context is not available: " + canvasId);
			}

			this.win.x = toPositiveNumber(koWidth, this.canvas.width || this.canvas.clientWidth || 300);
			this.win.y = toPositiveNumber(koHeight, this.canvas.height || this.canvas.clientHeight || 150);
			this.canvas.width = this.win.x;
			this.canvas.height = this.win.y;

			let computedStyle = null;
			if (typeof window !== 'undefined' && window.getComputedStyle) {
				computedStyle = window.getComputedStyle(this.canvas, null);
			}

			let fontSize = computedStyle ? parseFloat(computedStyle.getPropertyValue('font-size')) : 12;
			let fontFamily = computedStyle ? computedStyle.getPropertyValue('font-family') : 'sans-serif';
			let fontStyle = computedStyle ? computedStyle.getPropertyValue('font-style') : 'normal';
			let fontColor = computedStyle ? computedStyle.getPropertyValue('color') : '#000000';

			this.font = {
				px: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 12,
				weight: "normal",
				variant: fontStyle || "normal",
				color: fontColor || "#000000",
				family: fontFamily || "sans-serif",
			};

			Object.defineProperties(this.font, {
				style: {
					get: function() {
						return [this.variant, this.weight, this.px + "px", this.family]
							.filter(function(part) { return part && part !== "normal"; })
							.join(" ") || this.px + "px sans-serif";
					},
					enumerable: false
				},
				r: {
					get: function() {
						return this.px / 2;
					},
					enumerable: false
				}
			});

			this.resetDataState();
			this.ctx.font = this.font.style;
		}

		resetDataState() {
			this.x = [];
			this.y = [];
			this.miny = 0;
			this.maxy = 0;
			this.plot = {x: [], n: 0, y: [], hx: 0, hy: 0};

			this.legendData = {
				head: {text: "", x: 0, y: 0},
				lines: []
			};

			this.minXTextSize = {width: 0};
			this.maxXTextSize = {width: 0};
			this.maxYTextSize = {width: 0};
		}

		measure(value) {
			return this.ctx.measureText(String(value === undefined || value === null ? "" : value));
		}

		circle(x, y, r, color="") {
			let previousFillStyle = this.ctx.fillStyle;

			this.ctx.beginPath();
			this.ctx.arc(x, y, r, 0, Math.PI * 2, true);

			if (color !== "") {
				this.ctx.fillStyle = color;
			}

			this.ctx.fill();
			this.ctx.fillStyle = previousFillStyle;
		}

		test() {
			this.ctx.fillStyle = "#FF0000";
			this.ctx.fillRect(0, 15, this.win.x, 15);
		}

		setFont(font) {
			if (!font) {
				return;
			}

			for (let key in font) {
				if (key === "style" || key === "r") {
					continue;
				}

				if (key === "px") {
					let px = Number(font[key]);
					if (Number.isFinite(px) && px > 0) {
						this.font.px = px;
					}
				}
				else {
					this.font[key] = font[key];
				}
			}

			this.ctx.font = this.font.style;
		}

		init(x, y, head) {
			this.resetDataState();

			let series = Array.isArray(y) ? y : [];
			let labels = Array.isArray(x) ? x.slice() : [];

			if (labels.length === 0 && series.length > 0) {
				let maxLength = 0;
				for (let item of series) {
					if (item && Array.isArray(item.data)) {
						maxLength = Math.max(maxLength, item.data.length);
					}
				}
				labels = Array.from({length: maxLength}, function(_, index) { return index; });
			}

			this.x = labels;
			this.minXTextSize = this.measure(labels[0]);
			this.maxXTextSize = this.measure(labels[labels.length - 1]);

			let finiteValues = [];

			for (let i = 0; i < series.length; i++) {
				let source = series[i] || {};
				let line = Object.assign({}, source.legend || {});

				if (line.text !== undefined) {
					line.text = String(line.text);
					line.y = this.font.px * (i + 2);
					line.x = Math.round((this.win.x - this.measure(line.text).width) / 2);
					line.r = Math.max(1, (this.font.px - 2) / 2);
				}

				this.legendData.lines.push(line);

				let ydata = normalizeSeriesData(source.data, labels.length);
				for (let value of ydata) {
					if (value !== null) {
						finiteValues.push(value);
					}
				}

				this.y.push({data: ydata});
			}

			if (finiteValues.length > 0) {
				this.maxy = Math.max.apply(null, finiteValues);
				this.miny = Math.min.apply(null, finiteValues);
			}
			else {
				this.maxy = 1;
				this.miny = 0;
			}

			let minYTextSize = this.measure(formatTick(this.miny));
			let maxYTextSize = this.measure(formatTick(this.maxy));
			this.maxYTextSize = minYTextSize.width > maxYTextSize.width ? minYTextSize : maxYTextSize;

			let headText = head && head.text !== undefined ? String(head.text) : "";
			if (headText.length > 0) {
				this.legendData.head.text = headText;
				this.legendData.head.x = Math.round((this.win.x - this.measure(headText).width) / 2);
				this.legendData.head.y = this.font.px;
			}

			let legendBottom = this.legendData.head.text ? this.legendData.head.y + this.font.px : 0;
			for (let line of this.legendData.lines) {
				if (line.text !== undefined) {
					legendBottom = Math.max(legendBottom, line.y + this.font.px);
				}
			}

			this.plotWin.y0 = Math.max(this.font.px, legendBottom + this.font.px);
			this.plotWin.x0 = Math.max(this.maxYTextSize.width, this.maxXTextSize.width) + this.font.px;
			this.plotWin.xn = Math.max(this.plotWin.x0, this.win.x - this.minXTextSize.width);
			this.plotWin.yn = Math.max(this.plotWin.y0, this.win.y - 2 * this.font.px);

			this.rotateDataToPlot();
		}

		rotateDataToPlot() {
			this.plot = {x: [], n: 0, y: [], hx: 0, hy: 0};

			let count = this.x.length;
			if (count === 0) {
				return;
			}

			let plotdx = Math.max(0, this.plotWin.xn - this.plotWin.x0);
			let plotdy = Math.max(0, this.plotWin.yn - this.plotWin.y0);
			let steps = Math.max(count - 1, 1);
			let dy = this.maxy - this.miny;

			this.plot.hx = count > 1 ? plotdx / steps : 0;
			this.plot.hy = count > 1 ? plotdy / steps : plotdy;

			for (let i = 0; i < count; i++) {
				let xi = count === 1
					? this.plotWin.x0 + plotdx / 2
					: this.plotWin.x0 + i * this.plot.hx;
				this.plot.x.push(xi);
			}

			for (let yi of this.y) {
				let ploty = [];

				for (let yidata of yi.data) {
					if (yidata === null) {
						ploty.push(null);
						continue;
					}

					let ratio = dy === 0 ? 0.5 : (yidata - this.miny) / dy;
					ploty.push(this.plotWin.yn - plotdy * ratio);
				}

				this.plot.y.push(ploty);
			}

			this.plot.n = count;
		}

		axis(color = "#000000", lineWidth = 1) {
			this.ctx.beginPath();
			this.ctx.strokeStyle = color;
			this.ctx.lineWidth = lineWidth;
			this.ctx.moveTo(this.plotWin.xn, this.plotWin.yn);
			this.ctx.lineTo(this.plotWin.x0, this.plotWin.yn);
			this.ctx.lineTo(this.plotWin.x0, this.plotWin.y0);
			this.ctx.stroke();
		}

		pointsOnAxis(lineWidth = 1, filterx = 2, filtery = 1, color) {
			if (this.plot.n === 0) {
				return;
			}

			let dot = this.font.r;
			this.ctx.font = this.font.style;

			if (color) {
				this.ctx.strokeStyle = color;
			}
			else if ('color' in this.font) {
				this.ctx.strokeStyle = this.font.color;
			}
			else {
				this.ctx.strokeStyle = 'black';
			}

			this.ctx.fillStyle = this.ctx.strokeStyle;
			this.ctx.beginPath();
			this.ctx.lineWidth = lineWidth;

			filterx = Math.max(1, filterx);
			if (this.plot.hx > 0 && (this.maxXTextSize.width + this.font.px) > this.plot.hx) {
				filterx = Math.max(1, Math.ceil((2 * this.maxXTextSize.width + this.font.px) / this.plot.hx));
			}

			this.ctx.textBaseline = "middle";
			this.ctx.textAlign = "center";

			for (let i = 0; i < this.plot.n; i++) {
				this.ctx.moveTo(this.plot.x[i], this.plotWin.yn);
				this.ctx.lineTo(this.plot.x[i], this.plotWin.yn + dot);

				if (i % filterx === 0 || i === this.plot.n - 1) {
					this.ctx.fillText(this.x[i] + "", this.plot.x[i], this.plotWin.yn + this.font.px + dot);
				}
			}

			this.ctx.stroke();
			this.ctx.beginPath();
			this.ctx.textBaseline = "middle";
			this.ctx.textAlign = "right";

			let tickCount = Math.max(2, Math.min(6, this.plot.n));
			let ySteps = Math.max(tickCount - 1, 1);
			let plotdy = Math.max(0, this.plotWin.yn - this.plotWin.y0);
			let valueStep = (this.maxy - this.miny) / ySteps;

			filtery = Math.max(1, filtery);
			for (let i = 0; i < tickCount; i++) {
				let y = this.plotWin.yn - i * (plotdy / ySteps);
				this.ctx.moveTo(this.plotWin.x0, y);
				this.ctx.lineTo(this.plotWin.x0 - dot, y);

				if (i % filtery === 0 || i === tickCount - 1) {
					this.ctx.fillText(formatTick(this.miny + i * valueStep), this.plotWin.x0 - this.font.px, y);
				}
			}

			this.ctx.stroke();
		}

		clear(...params) {
			if (params.length > 0) {
				this.ctx.clearRect(...params);
			}
			else {
				this.ctx.clearRect(0, 0, this.win.x, this.win.y);
			}
		}

		legend(color) {
			if (!color) {
				if ('color' in this.font) {
					color = this.font.color;
				}
				else {
					color = '#000000';
				}
			}

			this.ctx.fillStyle = color;
			this.ctx.textBaseline = "middle";
			this.ctx.textAlign = "left";

			if (this.legendData.head.text) {
				this.ctx.fillText(this.legendData.head.text, this.legendData.head.x, this.legendData.head.y);
			}

			for (let line of this.legendData.lines) {
				if ('text' in line) {
					if ('color' in line) {
						this.circle(line.x - this.font.px, line.y, line.r, line.color);
					}

					this.ctx.fillStyle = color;
					this.ctx.fillText(line.text, line.x, line.y);
				}
			}
		}

		graph(lineWidth = 1, color = "#000000") {
			this.ctx.lineWidth = lineWidth;

			if (this.plot.n === 0) {
				return;
			}

			for (let yi = 0; yi < this.plot.y.length; yi++) {
				this.ctx.beginPath();

				let y = this.plot.y[yi];
				let x = this.plot.x;
				let line = this.legendData.lines[yi] || {};
				let lineColor = 'color' in line ? line.color : color;
				let lineStarted = false;
				let pointCount = 0;
				let lastPoint = null;

				this.ctx.strokeStyle = lineColor;

				for (let i = 0; i < this.plot.n; i++) {
					let xp = x[i];
					let yp = y[i];

					if (!Number.isFinite(xp) || !Number.isFinite(yp)) {
						lineStarted = false;
						continue;
					}

					if (!lineStarted) {
						this.ctx.moveTo(xp, yp);
						lineStarted = true;
					}
					else {
						this.ctx.lineTo(xp, yp);
					}

					pointCount++;
					lastPoint = {x: xp, y: yp};
				}

				if (pointCount === 1 && lastPoint) {
					this.circle(lastPoint.x, lastPoint.y, Math.max(2, lineWidth + 1), lineColor);
				}
				else if (pointCount > 1) {
					this.ctx.stroke();
				}
			}
		}
	}

	return {
		create: function(...params) {
			return new draw(...params);
		}
	};
});
