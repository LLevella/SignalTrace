import {expect, test} from '@playwright/test';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

let server;
let baseUrl;

test.beforeAll(async () => {
	server = http.createServer(async (request, response) => {
		try {
			const requestUrl = new URL(request.url, 'http://127.0.0.1');
			const pathname = requestUrl.pathname === '/' ? '/examples/benchmark.html' : requestUrl.pathname;
			const filePath = path.resolve(process.cwd(), `.${decodeURIComponent(pathname)}`);
			const root = `${process.cwd()}${path.sep}`;

			if (!filePath.startsWith(root)) {
				response.writeHead(403);
				response.end('Forbidden');
				return;
			}

			const ext = path.extname(filePath);
			const contentTypes = {
				'.html': 'text/html; charset=utf-8',
				'.js': 'text/javascript; charset=utf-8',
				'.mjs': 'text/javascript; charset=utf-8',
				'.css': 'text/css; charset=utf-8',
				'.json': 'application/json; charset=utf-8'
			};

			response.writeHead(200, {'content-type': contentTypes[ext] || 'application/octet-stream'});
			response.end(await fs.readFile(filePath));
		} catch (error) {
			response.writeHead(error.code === 'ENOENT' ? 404 : 500);
			response.end(error.message);
		}
	});

	await new Promise((resolve) => {
		server.listen(0, '127.0.0.1', resolve);
	});
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

test('example canvas renders non-empty pixels and visible threshold text', async ({page}) => {
	const browserErrors = [];
	page.on('console', (message) => {
		if (message.type() === 'error') {
			browserErrors.push(message.text());
		}
	});
	page.on('pageerror', (error) => {
		browserErrors.push(error.message);
	});

	await page.goto(`${baseUrl}/examples/benchmark.html`);
	await page.waitForFunction(() => {
		const result = document.getElementById('result');
		return result && !result.textContent.includes('Running');
	});
	expect(browserErrors).toEqual([]);

	const pixelStats = await page.locator('#chart').evaluate((canvas) => {
		const ctx = canvas.getContext('2d');
		const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		let nonTransparent = 0;
		let darkPixels = 0;

		for (let i = 0; i < image.length; i += 4) {
			if (image[i + 3] > 0) {
				nonTransparent++;
			}
			if (image[i] < 80 && image[i + 1] < 80 && image[i + 2] < 80 && image[i + 3] > 0) {
				darkPixels++;
			}
		}

		return {nonTransparent, darkPixels, width: canvas.width, height: canvas.height};
	});

	expect(pixelStats.width).toBeGreaterThan(0);
	expect(pixelStats.height).toBeGreaterThan(0);
	expect(pixelStats.nonTransparent).toBeGreaterThan(1000);
	expect(pixelStats.darkPixels).toBeGreaterThan(10);
});
