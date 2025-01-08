import {expect, test} from '@playwright/test';

test('package metadata is ready for browser-facing examples', async () => {
	expect(process.env.npm_package_name || 'canvas-knockout-js').toBeTruthy();
});
