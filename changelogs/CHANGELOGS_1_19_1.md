# Changelog (`1.19.0 -> 1.19.1`)

## Major Highlights

- Picked up the kit 1.7.1 fix for bootstrap credential scaffolding and `.env.local` provider credential loading.
- Enabled Gemini and OpenAI providers in the default `logics.yaml` configuration so the hybrid dispatcher is active out of the box.

## Kit update and provider activation

- Bumped the `logics/skills` submodule to kit `1.7.1`, which adds automatic `.env.local` placeholder generation during bootstrap and fixes the hybrid transport env loader to merge both `.env` and `.env.local`.
- Switched `logics.yaml` to enable both `openai` (gpt-4.1-mini) and `gemini` (gemini-2.0-flash) providers in the `hybrid_assist` block so the dispatcher can route to remote providers without further manual configuration.

## Validation

- `python3 -m unittest discover -s logics/skills/tests -p "test_*.py" -v`
- `python3 logics/skills/tests/run_cli_smoke_checks.py`
- `npm run ci:fast`
- `npm run release:changelog:validate`
