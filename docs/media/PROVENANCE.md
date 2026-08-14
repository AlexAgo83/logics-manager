# How the README captures are produced

Written by `scripts/dev/capture-readme-media.mjs`. Do not edit by hand: run the script.

```
node scripts/dev/capture-readme-media.mjs
```

## Framing

- Viewport: 1440x900, deviceScaleFactor 2.
- Browser: headless Chrome, launched through `scripts/dev/viewer-driver.mjs`, which is
  also what the attended viewer tour uses. Its launch flags include `--use-mock-keychain`
  so a capture run never prompts for the operator's Keychain.
- Corpus: this repository's own `logics/`, served by `logics-manager view`. Never the
  synthetic demo board -- `req_343` removed it from released artifacts, so a capture of
  it would document a screen a reader cannot reach.
- Each shutter waits on a selector the screen itself produces, never on a delay. A delay
  is a guess that becomes wrong on a slower machine and captures a screen mid-load.

## What each capture shows

- `viewer-board.png` — The board: the flow columns and the reference index beneath them.
- `viewer-document.png` — The reader: a request opened from the details panel, with its contents list.
- `viewer-health.png` — Validation health: lint, audit and workflow findings from this repository.
- `viewer-insights.png` — Corpus insights: the shape of the corpus and the signals worth acting on.

## Why this is not a CI job

It needs a real corpus and a running viewer, and images regenerated on every push would
churn the repository with pixel differences nobody asked for. Run it when the screens
change.
