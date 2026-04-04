# Changelog (`1.21.0 -> 1.21.1`)

## Major Highlights

- `Publish Release` est maintenant gardé par une vraie détection GitHub et reste visible mais désactivé avec une raison explicite quand le repo n'est pas publiable.
- `Check Environment` devient plus actionnable: résumé global, actions recommandées, statuts courants, détails techniques, et meilleure mise en avant dans `Recommended`.
- Le plugin rattrape mieux les anciens repos Logics: proposition proactive de `Update Logics Kit`, réconciliation bootstrap repo-local, réparation des bridges Claude et meilleur traitement des `.env*`.
- Le sous-module `logics/skills` est mis à jour vers `v1.9.1`.

## Release Workflow Guards

- Ajout d'une inspection GitHub explicite avant d'autoriser `Publish Release` dans l'UI.
- `Publish Release` reste visible mais désactivé avec un message précis si le repo n'a pas de remote GitHub compatible ou si `gh` n'est pas disponible.
- Ajout d'un consentement repo-local dans `logics.yaml` pour toute aide future de fast-forward sur la branche locale `release`.
- Le wording de `Prepare Release` ne laisse plus croire qu'une IA a tourné quand seule la vérification déterministe de readiness a été exécutée.
- Le plugin gère maintenant le cas où la version actuelle est déjà publiée: il propose un bump patch de la prochaine version au lieu de sembler ne rien faire.

## Environment And Migration UX

- `Check Environment` a été restructuré en QuickPick action-first avec ordre explicite: `Summary`, `Recommended actions`, `Current status`, `Technical details`.
- Les actions de remédiation sont maintenant formulées côté opérateur (`Fix now`, `Optional`) au lieu de lignes techniques ambiguës.
- L'extension peut lancer un check silencieux à l'ouverture et proposer directement `Update Logics Kit` quand un vieux kit canonique est détecté.
- Les repos canonically bootstrappés mais incomplets ne sont plus considérés comme automatiquement convergés.
- La réconciliation bootstrap couvre désormais `logics.yaml`, `.gitignore`, les artefacts runtime et les placeholders d'environnement.

## Claude Parity And Assistant-Neutral Wording

- Les surfaces partagées plugin passent à un wording assistant-neutral au lieu d'un wording Codex-only quand le flux fonctionne aussi avec Claude.
- Le context pack UI, les hints de session et plusieurs textes de guidage ont été renommés autour de `Assistant` / `AI assistant`.
- `Repair Logics Kit` sait maintenant recréer les bridges Claude attendus (`.claude/commands/*`, `.claude/agents/*`) au lieu de ne réparer que le chemin Codex.

## Version And Runtime Reliability

- Le plugin et le runtime vérifient maintenant l'alignement `package.json` / `VERSION`, et les scripts de changelog/release préfèrent `package.json` quand il existe.
- `Prepare Release` et `Publish Release` bloquent désormais les versions déjà taggées/publiées au lieu de traiter une release déjà live comme prête.
- Les placeholders API sont mis à jour dans tous les fichiers `.env*` trouvés à la racine du repo, avec création de `.env.local` seulement si aucun fichier env n'existe.
- `.vscodeignore` exclut maintenant correctement les fichiers `.env*` du VSIX.

## Bundled Kit Update

- Mise à jour du sous-module `logics/skills` vers `v1.9.1`.
- Le kit embarqué inclut le durcissement du flow de release, la détection des versions déjà publiées, la synchro des artefacts de version, et l'amélioration bootstrap sur tous les `.env*`.

## Validation

- `npm run lint:ts`
- `npm test`
- `npm run test:smoke`
- `npm run ci:check`
