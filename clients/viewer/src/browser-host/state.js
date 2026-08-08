/**
 * The state the viewer core shares with its screens.
 *
 * Three lifts produced three screens, and each one arrived at the same seam by hand: a
 * factory receiving a set of accessor thunks picked for it. That worked, and it cost a
 * wiring block every time -- which failed four different ways while being written: a value
 * read before it existed, a helper created below the call site, a function passed instead
 * of a thunk, an object key rewritten as a call. None of those are hard problems. They are
 * the price of composing a seam by hand each time.
 *
 * This names it once. The store carries what is actually shared -- measured, not assumed:
 * the four bindings the screens read. Everything else the host holds stays the host's, and
 * everything a screen owns stays private to that screen. A store that carried all
 * forty-three bindings would be a second name for the closure, not a boundary.
 *
 * Where a value is *persisted* is a different question, answered by `req_315`: this owns
 * the value in memory, the server owns the record.
 */
export function createViewerState(initial = {}) {
  let viewerPreferences = initial.viewerPreferences ?? {};
  let viewerFilterState = initial.viewerFilterState ?? {};
  let latestRepoRoot = initial.latestRepoRoot ?? "";
  let latestRepository = initial.latestRepository ?? null;

  const state = {};
  Object.defineProperties(state, {
    viewerPreferences: { get: () => viewerPreferences, set: (value) => { viewerPreferences = value; }, enumerable: true },
    viewerFilterState: { get: () => viewerFilterState, set: (value) => { viewerFilterState = value; }, enumerable: true },
    latestRepoRoot: { get: () => latestRepoRoot, set: (value) => { latestRepoRoot = value; }, enumerable: true },
    latestRepository: { get: () => latestRepository, set: (value) => { latestRepository = value; }, enumerable: true },
  });
  return state;
}

/**
 * The reader a screen is handed.
 *
 * A screen reads what it does not own and never writes it -- that rule held in all three
 * lifts and is worth keeping enforceable rather than remembered. Handing over a reader
 * instead of the store makes it structural: there is nothing to write through.
 */
export function readerFor(state) {
  const reader = {};
  for (const key of Object.keys(state)) {
    Object.defineProperty(reader, key, { get: () => state[key], enumerable: true });
  }
  return Object.freeze(reader);
}
