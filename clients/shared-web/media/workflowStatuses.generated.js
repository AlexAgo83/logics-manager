// AUTO-GENERATED from logics_manager/statuses.json. Do not edit by hand.
// Regenerate with `npm run generate:status-constants` (checked by `npm run check:status-constants`).
(() => {
  window.CdxWorkflowStatuses = {
    STATUS_STAGES: {"request":["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],"backlog":["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],"task":["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],"product":["Draft","Proposed","Active","Accepted","Validated","Rejected","Superseded","Settled","Archived"],"roadmap":["Draft","Proposed","Active","Accepted","Validated","Rejected","Superseded","Settled","Archived"],"architecture":["Draft","Proposed","Accepted","Validated","Rejected","Superseded","Settled","Archived"],"spec":["Draft","Ready","In progress","Done","Validated","Settled","Archived"],"runbook":["Draft","Active","Archived"]},
    OPEN_STATUSES: ["Draft","Ready","In progress","Blocked"],
    CLOSED_STATUSES: ["Done","Obsolete","Archived","Settled"],
    TERMINAL_STATUSES: ["Archived"]
  };
})();
