def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = []
    if argv in (["-h"], ["--help"]):
        print(
            "\n".join(
                [
                    "Logics Release CLI",
                    "Plan, inspect, and validate project-owned release workflow state.",
                    "",
                    "Usage:",
                    "  logics-manager release status [--format text|json]",
                    "  logics-manager release discover [--write] [--force] [--format text|json]",
                    "  logics-manager release plan <version> [--format text|json]",
                    "  logics-manager release validate <version> [--format text|json]",
                    "  logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--format text|json]",
                ]
            )
        )
        return 0
    if len(argv) >= 2 and argv[1] in {"-h", "--help"}:
        help_text = {
            "status": "Usage: logics-manager release status [--format text|json]",
            "discover": "Usage: logics-manager release discover [--write] [--force] [--format text|json]",
            "plan": "Usage: logics-manager release plan <version> [--format text|json]",
            "validate": "Usage: logics-manager release validate <version> [--format text|json]",
            "evidence": "Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--format text|json]",
        }.get(argv[0])
        if help_text:
            print(help_text)
            return 0
    parser = argparse.ArgumentParser(prog="logics-manager release", add_help=False)
    sub = parser.add_subparsers(dest="command")
    status = sub.add_parser("status", add_help=False)
    status.add_argument("--format", choices=("text", "json"), default="text")
    discover = sub.add_parser("discover", add_help=False)
    discover.add_argument("--write", action="store_true")
    discover.add_argument("--force", action="store_true")
    discover.add_argument("--format", choices=("text", "json"), default="text")
    plan = sub.add_parser("plan", add_help=False)
    plan.add_argument("version")
    plan.add_argument("--format", choices=("text", "json"), default="text")
    validate = sub.add_parser("validate", add_help=False)
    validate.add_argument("version")
    validate.add_argument("--format", choices=("text", "json"), default="text")
    evidence = sub.add_parser("evidence", add_help=False)
    evidence_sub = evidence.add_subparsers(dest="evidence_command")
    evidence_add = evidence_sub.add_parser("add", add_help=False)
    evidence_add.add_argument("gate_id")
    evidence_add.add_argument("--kind", required=True, choices=sorted(EVIDENCE_KINDS))
    evidence_add.add_argument("--status", required=True, choices=sorted(GATE_STATUSES))
    evidence_add.add_argument("--summary", required=True)
    evidence_add.add_argument("--target-version")
    evidence_add.add_argument("--commit")
    evidence_add.add_argument("--tag")
    evidence_add.add_argument("--observed-at")
    evidence_add.add_argument("--path")
    evidence_add.add_argument("--url")
    evidence_add.add_argument("--command", dest="evidence_command_text")
    evidence_add.add_argument("--run-id")
    evidence_add.add_argument("--format", choices=("text", "json"), default="text")
    parsed = parser.parse_args(argv)
    if parsed.command is None:
        raise SystemExit("Usage: logics-manager release <plan|status|validate> [args...]")
    repo_root = find_repo_root(Path.cwd())
    if parsed.command == "status":
        payload = release_status_payload(repo_root)
        print(render_payload(payload, parsed.format, lambda: render_release_status(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "discover":
        payload = release_discover_payload(repo_root, write=parsed.write, force=parsed.force)
        print(render_payload(payload, parsed.format, lambda: render_release_discover(payload)))
        return 0 if payload.get("ok") else 1
    if parsed.command == "plan":
        payload = release_plan_payload(repo_root, parsed.version)
        print(render_payload(payload, parsed.format, lambda: render_release_plan(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "evidence":
        if parsed.evidence_command != "add":
            raise SystemExit("Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text>")
        payload = release_add_evidence_payload(
            repo_root,
            gate_id=parsed.gate_id,
            kind=parsed.kind,
            status=parsed.status,
            summary=parsed.summary,
            target_version=parsed.target_version,
            commit=parsed.commit,
            tag=parsed.tag,
            observed_at=parsed.observed_at,
            path=parsed.path,
            url=parsed.url,
            command=parsed.evidence_command_text,
            run_id=parsed.run_id,
        )
        print(render_payload(payload, parsed.format, lambda: render_release_evidence_add(payload)))
        return 0 if payload.get("ok") else 1
    payload = release_validate_payload(repo_root, parsed.version)
    print(render_payload(payload, parsed.format, lambda: render_release_validate(payload)))
    return 0 if payload.get("ok") else 1
