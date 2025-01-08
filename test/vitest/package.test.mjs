import {describe, expect, it} from 'vitest';
import core, {createModel} from '../../dist/chart-core.mjs';

describe('modern package exports', () => {
	it('exports core helpers as default and named ESM exports', () => {
		expect(typeof core.createModel).toBe('function');
		expect(typeof createModel).toBe('function');
	});

	it('builds a finite chart model through ESM output', () => {
		const model = createModel({
			labels: ['a', 'b'],
			series: [{data: [1, 2]}],
			width: 320,
			height: 180,
			fontPx: 12
		});

		expect(model.plot.n).toBe(2);
		expect(Number.isFinite(model.plot.x[0])).toBe(true);
		expect(Number.isFinite(model.plot.y[0][0])).toBe(true);
	});
});
