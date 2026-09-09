## req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently - Say which operator preference store the viewer is using, and stop it forking silently
> From version: 2.23.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator preference store identity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The operator record is keyed to the process HOME, so a viewer launched under another HOME opens a different preferences file and favourites, projects and fleet roots appear lost. Make the store in use a stated fact, then settle where it belongs.
- Keywords: operator preferences, HOME, forked store, fleet roots, favourites, viewer settings
- Use when: Investigating missing viewer favourites, projects or fleet roots, or deciding where operator-scoped state lives.
- Skip when: Working on repository-scoped viewer preferences or on the fleet discovery defects already delivered in req_387.

# Needs
- Tell the operator which preference store the running viewer opened, so a store that forked is visible instead of looking like lost data.
- Decide, on evidence, whether the operator record should stay keyed to the process HOME or move to one stable location, and carry any existing store across deliberately rather than by accident.

# Context
- The operator-scoped record lives at `$LOGICS_VIEWER_PREFERENCES_HOME` or, unset, at the home-relative .config/logics-manager/viewer-preferences.json. Favorites, the last-used projects, the fleet discovery roots and the refresh interval are all in it.
- A viewer launched under a different HOME therefore opens a different file. On this machine four such files already exist: the operator home plus three tool-profile homes, one of which is what an agent session runs under.
- To the operator this is indistinguishable from data loss: the projects and the favorites are gone, and re-choosing the discovery root appears to fix it, because it writes the root into whichever store is now open.
- That symptom is exactly what F5 in req_387 reported. item_881 fixed a real defect on that path (one unreadable root raised out of the viewer constructor, and writes rewrote the saved list from the existence-filtered view), but neither of those explains a store that comes back when the root is re-chosen. This one does, and it was left out of that delivery's scope.
- The same keying applies to the viewer's other per-machine state: `_viewer_state_dir()` resolves TLS material and paired devices under the home-relative .cache/logics-manager directory, and the single-instance viewer claim is home-scoped too, so two HOMEs also mean two viewers that do not see each other.
- Nothing in the viewer states which file it opened. The Settings screen reports the repository, the address, the transport and the version, but not the record it is reading and writing.
- `doctor` already reports a comparable environment hazard (several logics-manager executables on PATH), so an environment-level finding has a home.

# Acceptance criteria
- AC1: The running viewer reports the absolute path of the operator preference store it opened, where it already reports what it is, and the launch banner names it too.
- AC2: When more than one operator preference store exists for the current user, that is reported as a warning naming each file and which one is in use, rather than being left for the operator to infer from missing favorites.
- AC3: The decision on stable-versus-HOME-keyed storage is recorded with its evidence before any storage change is made; if the record moves, an existing store is adopted only on an explicit operator action, never silently merged or overwritten.
- AC4: An operator whose store did fork can reach their previous favorites and fleet roots from the viewer without hand-editing JSON.
- AC5: A single-HOME install shows no new warning and keeps reading and writing exactly the file it does today; `LOGICS_VIEWER_PREFERENCES_HOME` keeps overriding everything, which is what the tests rely on.
- AC6: Each accepted change has a focused regression covering the forked-store case and the ordinary single-store case.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_116_trustworthy_viewer_actions_and_persistent_project_navigation.md

# Backlog
- `item_885_report_which_preference_store_the_viewer_opened`
- `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`
