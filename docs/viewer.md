[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# The Viewer

A local board over your `logics/*` documents. The columns are the three stages work moves
through (requests, backlog items, tasks), each showing what is live and folding what is
done. Product briefs, roadmaps, architecture decisions and the rest are a reference index
beside them: reachable, but not competing with the queue. Filterable, searchable, and
groupable by whatever you're deciding. It runs standalone (`logics-manager view`) or
embedded in the [VS Code extension](./vscode.md).

![The board: three flow columns (requests, backlog, tasks), each headed with how many are live against how many are done, beside a reference index of product briefs and roadmaps](media/viewer-board.png)

## Reading a document

Reading a document lists its sections down the left, marks where you are in them, and
gives the document itself the rest of the width: its tables, chain diagrams and code are
as much of it as its prose.

![The reader: a request opened with its fifteen sections listed down the left, its linked workflow drawn as a chain, and the document filling the width beside them](media/viewer-document.png)

## Insights and health

Corpus insights summarizes the shape of the corpus and the signals worth acting on, and
Validation health answers whether anything blocks, with a repair action where fixes are
automatic.

![Corpus insights: how many signals need attention across the corpus, the operator actions that address them, the corpus by stage and state, and the chains in flight](media/viewer-insights.png)

## List mode

The same documents read as a list instead of columns, grouped by type, status, theme or
nothing at all, sorted, and dated.

![The board in list mode: one row per document under collapsible group headers, each row carrying its status, linked-document count and age](media/viewer-board-list.png)

The captures above are produced by `scripts/dev/capture-readme-media.mjs` against this
repository's own corpus; [`media/PROVENANCE.md`](media/PROVENANCE.md) records the framing.
Viewer commands and options are in the [CLI reference](./cli.md).
