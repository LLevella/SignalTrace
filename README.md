# canvas-knockout-js

Небольшой AMD/Knockout-модуль для рисования кусочно-линейных графиков на
`canvas`. Изначально проект был написан для интерфейсов с очень малым запасом
памяти, например для отображения входящего и исходящего сетевого трафика.

## Текущее состояние

Проект остается legacy-прототипом: в нем нет npm-публикации, сборки, CI,
типов, лицензии и современной документации. Базовый renderer уже отделен от
примерной Knockout-страницы достаточно, чтобы его можно было стабилизировать
и постепенно вынести в самостоятельную библиотеку.

## Что умеет renderer

- рисовать несколько линейных серий на одном `canvas`;
- показывать подписи осей и простую легенду;
- работать с Knockout observable-значениями для `id`, ширины и высоты canvas;
- принимать обычные значения вместо observable-функций;
- безопасно переинициализироваться через повторный `init()`;
- добавлять live-точки через `append(label, values)`;
- ограничивать историю через `maxPoints`;
- рисовать на HiDPI/Retina canvas;
- пересчитывать размеры через `resize(width, height)`;
- задавать `yMin`, `yMax`, `yUnit`, formatters и thresholds.

## Устройство

- `chart-core.js` - чистое расчетное ядро без DOM: нормализует входные данные,
  считает легенду, область построения и координаты точек.
- `draw.js` - Canvas 2D renderer, который берет модель из `chart-core.js` и
  рисует оси, подписи, легенду и линии.
- `init.js` и `template.html` - пример legacy Knockout-интеграции.
- `ko.draw.js` - минимальный Knockout binding.

## Минимальный пример

```js
define(['core/draw'], function(draw) {
	var chart = draw.create(
		function() { return 'traffic-canvas'; },
		function() { return 500; },
		function() { return 300; }
	);

	chart.init(
		['00:00', '00:01', '00:02'],
		[
			{data: [10, 40, 20], legend: {text: 'rx', color: 'green'}},
			{data: [5, 20, 30], legend: {text: 'tx', color: 'blue'}}
		],
		{text: 'Traffic'}
	);

	chart.clear();
	chart.axis();
	chart.pointsOnAxis();
	chart.legend();
	chart.graph();
});
```

## Live update

```js
define(['core/draw'], function(draw) {
	var chart = draw.create('traffic-canvas', 500, 300);

	chart.init([], [
		{legend: {id: 'rx', text: 'rx', color: 'green'}},
		{legend: {id: 'tx', text: 'tx', color: 'blue'}}
	], {text: 'Traffic'}, {
		maxPoints: 300,
		yMin: 0,
		yUnit: ' Mbps',
		thresholds: [{value: 900, label: 'limit', color: 'orange'}]
	});

	chart.append('00:01', {rx: 120, tx: 84});
	chart.render();
});
```

## Проверки

```sh
npm test
```

Тесты запускаются без браузера через небольшой `canvas` harness и проверяют
ошибки, которые раньше легко пропустить вручную: отсутствие глобального
`canvas`, серии без легенды, одинокая точка, пустые данные, повторный `init()`
и отсутствие мутации входных массивов. Отдельные тесты `chart-core` проверяют
чистую модель без Canvas.

## Roadmap

Подробный план разработки сохранен в [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).

1. Стабилизировать legacy API: покрыть тестами layout, подписи осей, цвета,
   пропущенные значения и разные размеры canvas.
2. Добавить live API: `maxPoints`, `append(label, values)` и `render()`.
3. Расширить чистое ядро: расчет ticks, gaps, fixed/autoscale Y, units и
   форматтеры без DOM и без Knockout.
4. Улучшить renderer: HiDPI, resize и thresholds.
5. Добавить современную упаковку: TypeScript, ESM/CJS bundle, npm package,
   typed declarations, Vite/Vitest/Playwright и GitHub Actions.
6. Сделать продуктовую нишу явной: микро-библиотека для live time-series
   графиков в роутерах, IoT-панелях, embedded dashboards и сетевом мониторинге.
7. Добавить ожидаемые фичи: cursor tooltip и legend toggle.
8. Выпустить адаптеры: Web Component как базовый способ использования, затем
   тонкие wrappers для React, Vue, Svelte и legacy Knockout.
