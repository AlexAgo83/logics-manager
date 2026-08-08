# Viewer UI campaign

## Purpose

Check the delivered viewer the way an operator meets it, and catch the defect classes a
green unit suite does not see: a screen that stops fitting, controls drawn over each other,
a surface that is empty with no explanation, an action offered but unavailable without
saying why.

The campaign has two halves. The automated one runs on every delivery, as one of the checks
in `scripts/ci-check.mjs`. Run the attended one when the change touches layout, the visual
language, or the extension host.

## Automated campaign

```sh
npm run test:viewer-smoke
```

It starts the real viewer on an ephemeral port, drives headless Chrome over the debugging
protocol — no browser-automation dependency — sweeps three viewports, writes one PNG per
viewport plus `report.txt` and `summary.json`, and **exits non-zero when a check fails**, so
it can gate a delivery.

On macOS the campaign launches Chrome with `--use-mock-keychain`, so a headless run cannot
raise a Keychain authorization dialog and cannot reach real saved passwords. It always runs
in a throwaway profile under the artifacts directory, which it removes afterwards: your own
Chrome profile is never involved. If a Keychain dialog ever appears during a run, that is the
defect — never a reason to reset or edit Keychain entries.

Output lands in `artifacts/local-viewer-smoke/`, which is outside version control. Captures
show your own workflow documents: they are a local review artifact, not something to attach
to a commit.

What it covers, per viewport:

| Group | What it asserts |
| --- | --- |
| Payload | The item payload arrives and the board renders cards |
| Regions | Topbar, repo pill, board and details are not blank |
| Flows | A card opens its document; insights and health render; refresh states what it did; an activity entry opens its document |
| Layout | No sibling controls drawn over each other, nothing clipped outside the viewport, no sideways page scroll, no unexplained empty surface, no silently disabled action, a heading structure that does not skip a level |
| Filters | The count agrees with the board and follows the search box; a control that regroups the board changes what it shows; a type filter returns only what it names |
| Completion | Every navigation target reaches a terminal status, so a finished screen is distinguishable from one still working |
| Console | No browser error or warning during the run |

The layout checks read their lists **from the interface**, never from a hand-written
enumeration: a surface or control added later is covered without editing a check. A
hand-written list is how a whole workspace escaped a guard for an entire request in a
sibling project. They live in `tests/helpers/viewer-layout-checks.mjs` and
`tests/helpers/viewer-filter-checks.mjs`, which the campaign serializes into the page and
`tests/viewer.layout-checks.test.ts` and `tests/viewer.filter-checks.test.ts` import
directly, so the checks that pass in the test suite are the checks that run in the browser.

The filter checks walk every option of every filter group from the controls themselves. They
were added after the campaign ran green through a board that rendered nothing under four of
its own type options: it asserted the board was not blank, never that a filter returned what
it named.

Useful knobs:

- `VIEWER_CAMPAIGN_VIEWPORTS=desktop` sweeps one viewport instead of three. Skipped
  viewports are reported as skipped, so a narrowed run never looks like a full one.
- `VIEWER_CAMPAIGN_OUT=<dir>` writes elsewhere than the default artifacts directory.
- `VIEWER_CAMPAIGN_INJECT_FAILURE=1` adds a check that always fails, which is how the
  campaign's own regression test drives its reporting.
- `LOCAL_VIEWER_SMOKE_FORCE_JSDOM=1` forces the headless-DOM fallback.

## Reading the result

`report.txt` lists every check as `OK` / `KO` / `--` with the value it measured, then the
findings.

- A **KO** is a defect **or** a stale expectation. Read the measured value before deciding
  which — that is what it is printed for.
- A **--** is a check that could not run: no Chrome present, a headless DOM that performs no
  layout, a viewport not requested. It is not a pass, and it is not a defect.
- A failed check does not end the run. Checks after it still ran, and a later failure may be
  the same cause rather than a second defect.

**A run with zero findings is not a pass on its own.** A sibling project's campaign reported
zero findings while a settings form was drawing four rows on top of each other: no assertion
looked at overlap, so none failed. Open the captures. When a defect turns up that the checks
missed, add the check in the same change.

## Attended campaign

The automated pass cannot judge whether a screen *reads* well, and it does not exercise the
extension host boundary — `acquireVsCodeApi`, the message channel, the CSP nonce — which the
headless-DOM tests in `tests/webview.*.test.ts` and `tests/cspNonce.test.ts` cover instead.

```sh
node scripts/dev/viewer-tour.mjs        # scripted walk of every screen, with captures
python3 -m logics_manager view          # the standalone viewer, by hand
code --extensionDevelopmentPath=.       # the same interface inside the extension host
```

The tour asserts nothing. It walks all fourteen navigation targets, measures how long each
screen takes to say it has loaded, records what it offers and what it leaves empty, captures
each one, and reports every console and network problem it saw. Read
`artifacts/viewer-tour/` afterwards: the captures are the point, and the numbers are there to
tell you where to look first.

Both surfaces render one source: `clients/viewer/` is the committed original,
`scripts/build/build-assets.mjs` copies it into the package payload, and the extension
packages the same entry document. What the automated campaign checks in the standalone
viewer therefore holds for both; what remains attended is how it reads, and how it behaves
inside the host.

## Where the findings go

A defect in already-delivered scope becomes a Logics slice, not a TODO:

```sh
logics-manager flow scaffold request-chain --input logics/scaffold/<slug>.json --dry-run
```

Carry the test name into the slice as acceptance proof, the way `req_308` and `req_309` did.

## Verify

```sh
npx vitest run tests/viewer.layout-checks.test.ts tests/viewer.filter-checks.test.ts tests/viewer.campaign-report.test.ts
```

The layout checks and the campaign's reporting each have their own regression tests, so a
break usually fails there first. The campaign is the wider net, not the first line.
