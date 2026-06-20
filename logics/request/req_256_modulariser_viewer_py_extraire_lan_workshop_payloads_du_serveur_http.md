## req_256_modulariser_viewer_py_extraire_lan_workshop_payloads_du_serveur_http - Modulariser viewer.py (extraire LAN, Workshop, payloads du serveur HTTP)
> From version: 2.11.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- `logics_manager/viewer.py` a atteint ~5 153 lignes et concentre plusieurs concerns indépendants dans un seul module, ce qui le rend difficile à lire, tester et faire évoluer.
- Le plus gros smell : `LogicsViewerRequestHandler` (~1 286 lignes) et le serveur HTTP cohabitent avec des registres de sessions, un broker d'appairage LAN et des builders de payload qui n'ont pas de couplage fort entre eux.
- Objectif : extraire les concerns autonomes vers des modules dédiés sans changement de comportement, pour réduire la taille du fichier serveur et clarifier les frontières.

# Context
- Découpage cible (par ordre de risque croissant) :
  - `viewer_lan.py` (~180 l) : `_PairedDevice`, `LanDeviceRegistry`, `_PendingPairing`, `LanPairingBroker` — concern le plus autonome, à extraire en premier.
  - `viewer_workshop.py` (~440 l) : `WorkshopCommandSession`, `WorkshopSessionRegistry`, `WorkshopTerminalSession`, `WorkshopTerminalRegistry`.
  - `viewer_payloads.py` (~600+ l) : builders `cdx_*` (13 fonctions, dont `cdx_status_payload`/`_enrich_cdx_resume_status`), `git_*`, `ci_*`, `viewer_*`.
  - `viewer.py` (reste, ~1 400 l) : `LogicsViewerServer` + `LogicsViewerRequestHandler`.
- Refactoring iso-comportement : aucune API publique ni route HTTP modifiée ; uniquement des déplacements + imports.
- Lié au travail récent sur `cdx_status_payload`/`_enrich_cdx_resume_status` (badge unread des Missions, commit f8ad8fd).

# Acceptance criteria
- AC1: `viewer_lan.py` et `viewer_workshop.py` sont extraits ; `viewer.py` ne contient plus que le serveur HTTP + le request handler (et éventuellement les payloads si AC3 est inclus).
- AC2: Aucun changement de comportement observable (routes, payloads, appairage LAN, sessions workshop) ; `pytest tests/python/` et la suite vitest passent sans modification de tests d'intégration.
- AC3: (optionnel/2e slice) builders de payload extraits vers `viewer_payloads.py`.
- AC4: Les imports restent rétro-compatibles (ré-export depuis `viewer.py` si du code externe importe ces symboles).

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py` (cible principale, ~5 153 lignes)
- `tests/python/test_logics_manager_cli.py` (couverture des payloads/handler)
- `tests/viewer.browser-host.test.ts` (contrat front consommé via les routes)

# AI Context
- Summary: Modulariser viewer.py en extrayant les concerns autonomes (LAN pairing, sessions Workshop, builders de payload) hors du serveur HTTP, sans changement de comportement.
- Keywords: refactor, viewer.py, modularisation, HTTP handler, workshop sessions, LAN pairing, payload builders
- Use when: On veut réduire la taille de viewer.py et clarifier ses frontières internes.
- Skip when: Un refactor du serveur HTTP est déjà en cours ou conflictuel.

# Backlog
- none
