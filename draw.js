define(['./chart-core'], function(core) {
	'use strict';

	// ---------------------------------------------------------------------------------
	class draw {
		constructor(koCanvas, koWidth, koHeight) {
			this.win = {x: 0, y: 0};

			let canvasId = core.resolveValue(koCanvas);
			this.canvas = document.getElementById(canvasId);

			if (!this.canvas) {
				throw new Error("Canvas element not found: " + canvasId);
			}

			this.ctx = this.canvas.getContext && this.canvas.getContext('2d');

			if (!this.ctx) {
				throw new Error("Canvas 2D context is not available: " + canvasId);
			}

			this.win.x = core.toPositiveNumber(koWidth, this.canvas.width || this.canvas.clientWidth || 300);
			this.win.y = core.toPositiveNumber(koHeight, this.canvas.height || this.canvas.clientHeight || 150);
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

		applyModel(model) {
			this.x = model.x;
			this.y = model.y;
			this.miny = model.miny;
			this.maxy = model.maxy;
			this.plotWin = model.plotWin;
			this.plot = model.plot;
			this.legendData = model.legendData;
			this.minXTextSize = model.minXTextSize;
			this.maxXTextSize = model.maxXTextSize;
			this.maxYTextSize = model.maxYTextSize;
		}

		resetDataState() {
			this.applyModel(core.createEmptyState());
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
				if (key === "r") {
					continue;
				}

				if (key === "style") {
					this.font.variant = font[key];
				}
				else if (key === "px") {
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
			this.applyModel(core.createModel({
				labels: x,
				series: y,
				head: head,
				width: this.win.x,
				height: this.win.y,
				fontPx: this.font.px,
				measureText: this.measure.bind(this)
			}));
		}

		rotateDataToPlot() {
			this.plot = core.createPlotModel(this.x, this.y, this.plotWin, this.miny, this.maxy);
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
					this.ctx.fillText(core.formatTick(this.miny + i * valueStep), this.plotWin.x0 - this.font.px, y);
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
