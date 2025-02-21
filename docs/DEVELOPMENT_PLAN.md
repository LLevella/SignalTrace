# Development Plan

Цель проекта: превратить legacy AMD/Knockout canvas-прототип в современную,
маленькую и полезную библиотеку для live time-series графиков в интерфейсах
с ограниченными ресурсами: роутеры, IoT-панели, embedded dashboards,
сетевой мониторинг и компактные админки.

## Позиционирование

Не конкурировать напрямую с большими charting-платформами. Главная ниша:
быстрый, предсказуемый и малый по размеру canvas-график для потоковых метрик.

Ключевые качества:

- маленький runtime;
- устойчивое потребление памяти;
- простой live update API;
- хорошая работа на слабом железе;
- возможность использовать без фреймворка;
- тонкие адаптеры для популярных фреймворков.

## Фаза 1. Legacy Stabilization

Статус: done.

Результаты:

- исправлен доступ к canvas без зависимости от браузерной глобальной
  переменной;
- добавлена защита от пустых данных, одиночной точки, отсутствующей легенды
  и нечисловых значений;
- входные массивы больше не мутируются;
- повторный `init()` больше не накапливает старое состояние;
- добавлен `npm test` и browserless test harness.

## Фаза 2. Core Extraction

Статус: done.

Результаты:

- добавлен `chart-core.js` как чистое расчетное ядро без DOM и Canvas;
- `draw.js` стал Canvas 2D renderer поверх модели из core;
- добавлены отдельные тесты на нормализацию данных и расчет plot model.

## Фаза 3. Live Time-Series API

Статус: done.

Цель: сделать библиотеку удобной для настоящих потоковых графиков.

Задачи:

- добавлен bounded data buffer через `maxPoints`;
- добавлен `append(label, values)` для добавления одной новой точки;
- поддержаны values как массив и как объект по ключам серий;
- сохранена совместимость со старым `init(labels, series, head)`;
- добавлен `render()` как короткий путь для перерисовки текущей модели;
- live update поведение покрыто тестами.

Ожидаемый API:

```js
var chart = draw.create('traffic-canvas', 500, 300);

chart.init([], [
    {legend: {id: 'rx', text: 'rx', color: 'green'}},
    {legend: {id: 'tx', text: 'tx', color: 'blue'}}
], {text: 'Traffic'}, {maxPoints: 300});

chart.append('00:01', {rx: 120, tx: 84});
chart.render();
```

## Фаза 4. Rendering Quality

Статус: done.

Задачи:

- добавлен HiDPI/Retina scaling;
- добавлен `resize(width, height, options)`;
- добавлен расчет Y ticks в core;
- добавлены `xFormatter`, `yFormatter`, `yUnit`;
- сохранены gaps для пропущенных данных;
- добавлены `yMin`, `yMax`, `yPadding`, `yTickCount`;
- добавлены thresholds/limit lines.

## Фаза 5. Modern Packaging

Статус: done.

Задачи:

- добавлен package metadata и `exports`;
- добавлен dependency-free build script для `dist/*.mjs` и `dist/*.cjs`;
- добавлены TypeScript declarations в `dist/index.d.ts`;
- добавлены TypeScript/Vite/Vitest/Playwright config files;
- добавлен Vitest smoke test для modern ESM package output;
- добавлен GitHub Actions CI;
- добавлены MIT license, changelog и `0.1.0` version.

## Фаза 6. Framework-Agnostic Component

Статус: done.

Задачи:

- добавлен `time-series-chart` Web Component;
- добавлены тонкие adapters для React, Vue и Svelte;
- legacy Knockout adapter сохранен через `./legacy/amd/knockout`;
- добавлен live example для router traffic.

## Фаза 7. Adoption

Статус: planned.

Задачи:

- англоязычный README;
- документация "5 минут до первого графика";
- benchmark page;
- сравнение с Chart.js, uPlot и ECharts;
- demo site;
- issue templates и contribution guide.
