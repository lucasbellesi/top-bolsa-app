# Contributing

## Quality gates

- Run `npm run verify` before opening a PR.
- Pre-commit formatting and lint fixes run through `husky` and `lint-staged`.
- Keep behavior-preserving refactors separate from feature work when possible.

## Architecture conventions

- `src/core`: app-wide concerns such as config, logging, theme, and navigation.
- `src/features`: feature-specific hooks, UI sections, and selectors.
- `src/shared`: reusable UI and pure helpers that do not own business flows.
- `src/services`: network and backend integration boundaries.

## Code style

- Prefer PascalCase for components and `useX` for hooks.
- Keep remote DTO parsing at the service edge.
- Prefer pure helpers over inline transformations when logic is reused or testable.
- Avoid adding new global state unless the data is truly cross-feature and non-server state.
