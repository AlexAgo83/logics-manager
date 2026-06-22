def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = _find_repo_root_from(Path.cwd())
    payload = audit_payload(
        repo_root,
        stale_days=args.stale_days,
        skip_ac_traceability=args.skip_ac_traceability,
        skip_gates=args.skip_gates,
        legacy_cutoff_version=args.legacy_cutoff_version,
        group_by_doc=args.group_by_doc,
        autofix_ac_traceability=args.autofix_ac_traceability,
        paths=args.paths,
        refs=args.refs,
        since_version=args.since_version,
        token_hygiene=args.token_hygiene,
        autofix_structure=args.autofix_structure,
        governance_profile=args.governance_profile,
    )
    output = json.dumps(payload, indent=2, sort_keys=True) if args.format == "json" else render_audit(
        repo_root,
        stale_days=args.stale_days,
        skip_ac_traceability=args.skip_ac_traceability,
        skip_gates=args.skip_gates,
        legacy_cutoff_version=args.legacy_cutoff_version,
        output_format=args.format,
        group_by_doc=args.group_by_doc,
        autofix_ac_traceability=args.autofix_ac_traceability,
        paths=args.paths,
        refs=args.refs,
        since_version=args.since_version,
        token_hygiene=args.token_hygiene,
        autofix_structure=args.autofix_structure,
        governance_profile=args.governance_profile,
    )
    print(output)
    return 0 if payload["ok"] else 1
