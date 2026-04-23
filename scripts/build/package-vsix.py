from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import zipfile
from xml.sax.saxutils import escape


ROOT = Path.cwd()
EXTENSION_ROOT = "extension"
EXTENSION_NAME = "cdx-logics-vscode"
EXTENSION_ID = "cdx-logics-vscode"


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


def build_content_types_xml() -> str:
    return """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="xml" ContentType="text/xml" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="py" ContentType="text/x-python" />
  <Default Extension="svg" ContentType="image/svg+xml" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Override PartName="/extension.vsixmanifest" ContentType="text/xml" />
</Types>
"""


def build_vsix_manifest(package_json: dict[str, object]) -> str:
    publisher = str(package_json["publisher"])
    version = str(package_json["version"])
    display_name = escape(str(package_json.get("displayName", EXTENSION_NAME)))
    description = escape(str(package_json.get("description", "")))
    engines = package_json.get("engines", {})
    vscode_version = ""
    if isinstance(engines, dict):
        vscode_version = str(engines.get("vscode", ""))
    installation_version = escape(vscode_version.lstrip("^"))
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="{escape(EXTENSION_ID)}" Version="{escape(version)}" Language="en-US" Publisher="{escape(publisher)}" />
    <DisplayName>{display_name}</DisplayName>
    <Description>{description}</Description>
    <Icon>extension/media/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[{installation_version},)" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/media/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>
"""


def build_vsix(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    package_json["name"] = EXTENSION_NAME
    package_json["public"] = True
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", build_content_types_xml())
        archive.writestr("extension.vsixmanifest", build_vsix_manifest(package_json))
        archive.writestr(
            f"{EXTENSION_ROOT}/package.json",
            json.dumps(package_json, indent=2, sort_keys=True) + "\n",
        )
        for optional_name in ["README.md", "CHANGELOG.md", "LICENSE"]:
            optional_path = ROOT / optional_name
            if optional_path.exists():
                add_file(archive, optional_path, f"{EXTENSION_ROOT}/{optional_name}")
        add_directory(archive, ROOT / "dist", f"{EXTENSION_ROOT}/dist")
        add_directory(archive, ROOT / "media", f"{EXTENSION_ROOT}/media")
        add_directory(archive, ROOT / "logics_manager", f"{EXTENSION_ROOT}/logics_manager")
        add_file(archive, ROOT / "scripts" / "logics-manager.py", f"{EXTENSION_ROOT}/scripts/logics-manager.py")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a local VSIX archive without external tooling.")
    parser.add_argument("--out", required=True, help="Output VSIX path")
    args = parser.parse_args()

    build_vsix(Path(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
