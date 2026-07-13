# Logics Manager 2.18.0

## Project tools in the viewer

- Adds convention-aware **Translations** and **Theme** screens to the viewer and VS Code plugin.
- Merges supported project tools into the **Workshop** menu behind a visual separator, while hiding unavailable entries for unsupported repositories.
- Detects conventional JSON locale catalogs, aligns nested keys across locales, reports missing, extra, and empty values, supports search, and safely edits existing string values.
- Detects conventional CSS custom-property themes, groups tokens by visual category, renders isolated previews, and safely edits existing declarations.
- Recognizes conventional JavaScript and TypeScript translation dictionaries and theme modes as bounded read-only sources.

## Shared i18n contract

- Introduces the optional project-owned i18n contract v1 without prescribing a runtime library.
- Adds `logics-manager i18n status`, `init`, `plan`, `lint`, and `validate` for source-only initialization, explicit not-applicable projects, catalog diagnostics, and CI validation.
- Validates repository-contained catalog paths, semantic key segments, non-empty string leaves, exact locale parity, and named-placeholder parity.
- Makes i18n readiness a default consideration in generated project guidance and exposes declared catalogs through the viewer project tools.
- Documents adoption, staged migration from visible-text lookup, locale addition, CI usage, and recovery guidance.

## Validation

- `node scripts/ci-check.mjs`
- `npm run release:changelog:validate`
- `logics-manager release validate 2.18.0`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
