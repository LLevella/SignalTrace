# Contributing

Thanks for helping improve the project.

## Local Checks

```sh
npm install
npm run check
npm run test:unit
npm run test:e2e
npm run typecheck
npm run audit:prod
npm pack --dry-run
```

## Development Notes

- Keep `chart-core.js` DOM-free.
- Keep `draw.js` focused on Canvas 2D rendering.
- Preserve legacy AMD compatibility unless a change explicitly targets a major
  release.
- Run `npm run build` after changes that affect `chart-core.js`, `draw.js` or
  generated TypeScript declarations.
- Add tests for every bug fix and new public API option.

## Release Checklist

1. Update `CHANGELOG.md`.
2. Run all local checks.
3. Run `npm pack --dry-run` and inspect package contents.
4. Tag the release with the package version.
