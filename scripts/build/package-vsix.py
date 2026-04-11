from __future__ import annotations

import argparse
import os
from pathlib import Path
import zipfile


ROOT = Path.cwd()
EXTENSION_ROOT = "extension"


def add_file(archive: zipfile.ZipFile, source: Path, target: str) -> None:
    archive.write(source, target)


def add_directory(archive: zipfile.ZipFile, source_dir: Path, target_dir: str) -> None:
    if not source_dir.exists():
        raise FileNotFoundError(f"Missing required directory: {source_dir}")
    for path in sorted(source_dir.rglob("*")):
        if not path.is_file():
            continue
        target = f"{target_dir}/{path.relative_to(source_dir).as_posix()}"
        add_file(archive, path, target)


def build_vsix(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        add_file(archive, ROOT / "package.json", f"{EXTENSION_ROOT}/package.json")
        for optional_name in ["README.md", "CHANGELOG.md", "LICENSE"]:
            optional_path = ROOT / optional_name
            if optional_path.exists():
                add_file(archive, optional_path, f"{EXTENSION_ROOT}/{optional_name}")
        add_directory(archive, ROOT / "dist", f"{EXTENSION_ROOT}/dist")
        add_directory(archive, ROOT / "media", f"{EXTENSION_ROOT}/media")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a local VSIX archive without external tooling.")
    parser.add_argument("--out", required=True, help="Output VSIX path")
    args = parser.parse_args()

    build_vsix(Path(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
