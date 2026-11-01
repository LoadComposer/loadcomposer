#!/usr/bin/env python3
"""Create a deterministic deployable delivery, separate from the QA bundle."""

from __future__ import annotations

from collections import Counter
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import zipfile

SOURCE = Path(__file__).resolve().parent.parent
VERSION = (SOURCE / "VERSION").read_text().strip()
NAME = f"loadcomposer-v{VERSION}-delivery.zip"
OUTPUT = Path(os.environ.get("LOADCOMPOSER_DELIVERY_ZIP", SOURCE.parent / NAME)).resolve()
QA_BUNDLE = Path(os.environ.get("LOADCOMPOSER_TEST_BUNDLE_ZIP", SOURCE / f"loadcomposer-v{VERSION}-test-bundle.zip")).resolve()
RESULT = os.environ.get("LOADCOMPOSER_PACKAGING_RESULT")
MANIFEST = f"DELIVERY_MANIFEST-v{VERSION}.txt"
SUMS = f"SHA256SUMS-v{VERSION}.txt"
TEMP_NAME = re.compile(r"zi[A-Za-z0-9]{5,}")
WIN_INVALID = re.compile(r'[<>:"\\|?*]|[. ]$')
WIN_RESERVED = re.compile(r"(?i)^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$")

def fail(message: str) -> None:
    raise SystemExit(message)

def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def files(root: Path) -> list[Path]:
    return sorted((p for p in root.rglob("*") if p.is_file()),
                  key=lambda p: p.relative_to(root).as_posix())

if OUTPUT.is_relative_to(SOURCE):
    fail("Delivery ZIP must be built outside the source directory")
if not QA_BUNDLE.is_file():
    fail(f"External QA bundle missing: {QA_BUNDLE}")

excluded: dict[str, str] = {}
included: list[Path] = []
folded: set[str] = set()
for path in files(SOURCE):
    relative = path.relative_to(SOURCE)
    parts = relative.parts
    if "node_modules" in parts:
        continue
    name = relative.as_posix()
    # Atomic publication of an archive may briefly expose a sibling staging
    # name. It is output, never an input to the deployable source package.
    if len(parts) == 1 and re.fullmatch(r"\.loadcomposer-v\d+\.\d+\.\d+-test-bundle\.zip\.[A-Za-z0-9]+", name):
        continue
    if any(part in ("__pycache__", ".cache", ".pytest_cache", ".mypy_cache") or TEMP_NAME.fullmatch(part) or
           part.endswith((".tmp", ".part", ".pyc")) for part in parts):
        fail(f"Unexpected temporary file in source: {name}")
    if any(WIN_INVALID.search(part) or WIN_RESERVED.fullmatch(part) for part in parts):
        fail(f"Windows-unsafe path: {name}")
    folded_name = name.casefold()
    if folded_name in folded:
        fail(f"Case-insensitive path collision: {name}")
    folded.add(folded_name)
    if name in (MANIFEST, SUMS):
        continue
    top = parts[0]
    reason = None
    if top in ("tests", ".github"):
        reason = "automated QA in external test bundle"
    elif name in (f"FINAL_REPORT-v{VERSION}.md", f"QUALITY_IMPROVEMENT-v{VERSION}.md", f"QUALITY_REFINEMENT-C1b-v{VERSION}.md", f"PERFORMANCE_C2-v{VERSION}.md", f"FUNCTIONAL_HOTFIX-C3b-v{VERSION}.md", f"CAPACITY_VALIDATION_HOTFIX-C3d-v{VERSION}.md", f"OPERATIONAL_LAYOUT_HOTFIX-C3f-v{VERSION}.md", f"OPERATIONAL_ELIGIBILITY_HOTFIX-C3h-v{VERSION}.md"):
        reason = "final report supplied separately"
    elif "-evidence-v1." in top or top.startswith("planner-density-before-v1."):
        reason = "screenshot evidence in external/historical test bundle"
    elif len(parts) == 1 and name.endswith("-test-bundle.zip"):
        reason = "test bundle supplied separately"
    elif top in (f"hotfix-v01-v{VERSION}", f"quality-c1-v{VERSION}", f"quality-c1b-v{VERSION}", f"performance-c2-v{VERSION}", f"functional-c3b-v{VERSION}", f"capacity-c3d-v{VERSION}", f"operational-c3f-v{VERSION}", f"operational-c3h-v{VERSION}", f"provenance-c3j-v{VERSION}", f"polish-c4a-v{VERSION}"):
        reason = "hotfix QA in external test bundle"
    elif len(parts) == 1 and path.suffix in (".json", ".log") and name not in ("package.json", "package-lock.json"):
        reason = "QA result in external/historical test bundle"
    if reason:
        excluded[name] = reason
    else:
        included.append(path)

required = {"package.json", "package-lock.json", "scripts/browser-runtime.mjs"}
selected = {path.relative_to(SOURCE).as_posix() for path in included}
if not required <= selected:
    fail(f"Required build inputs excluded: {sorted(required - selected)}")
package = json.loads((SOURCE / "package.json").read_text())
lock = json.loads((SOURCE / "package-lock.json").read_text())
if package["version"] != VERSION or lock["version"] != VERSION or lock["packages"][""]["devDependencies"] != package["devDependencies"]:
    fail("npm descriptors are not synchronized")

# An exclusion is permitted only when the byte-identical evidence is present
# in the separate current QA bundle or its preserved historical v1.4 bundle.
with zipfile.ZipFile(QA_BUNDLE) as qa:
    qa_names = {i.filename.split("/", 1)[-1]: i for i in qa.infolist() if not i.is_dir()}
    old_name = "loadcomposer-v1.4.0-test-bundle.zip"
    if old_name not in qa_names:
        fail("Historical v1.4 test bundle missing from external QA bundle")
    old_path = SOURCE / old_name
    if not old_path.is_file() or hashlib.sha256(qa.read(qa_names[old_name])).hexdigest() != digest(old_path):
        fail("Historical v1.4 test bundle changed during QA separation")
    with zipfile.ZipFile(io.BytesIO(qa.read(qa_names[old_name]))) as old:
        old_names = {i.filename.split("/", 1)[-1]: i for i in old.infolist() if not i.is_dir()}
        for name in excluded:
            if name.endswith("-test-bundle.zip") or name in (f"FINAL_REPORT-v{VERSION}.md", f"QUALITY_IMPROVEMENT-v{VERSION}.md", f"QUALITY_REFINEMENT-C1b-v{VERSION}.md", f"PERFORMANCE_C2-v{VERSION}.md", f"FUNCTIONAL_HOTFIX-C3b-v{VERSION}.md", f"CAPACITY_VALIDATION_HOTFIX-C3d-v{VERSION}.md", f"OPERATIONAL_LAYOUT_HOTFIX-C3f-v{VERSION}.md", f"OPERATIONAL_ELIGIBILITY_HOTFIX-C3h-v{VERSION}.md"):
                continue
            expected = digest(SOURCE / name)
            preserved = False
            for archive, index in ((qa, qa_names), (old, old_names)):
                if name in index and hashlib.sha256(archive.read(index[name])).hexdigest() == expected:
                    preserved = True
                    break
            if not preserved:
                fail(f"Excluded QA file is not preserved byte-identically: {name}")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="loadcomposer-delivery-", dir=SOURCE.parent) as temporary:
    stage = Path(temporary) / f"delivery-v{VERSION}"
    stage.mkdir()
    for path in included:
        target = stage / path.relative_to(SOURCE)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    manifest = "".join(
        f"{digest(path)}  {path.stat().st_size}  {path.relative_to(stage).as_posix()}\n"
        for path in files(stage)
    )
    (stage / MANIFEST).write_text(manifest)
    sums = "".join(f"{digest(path)}  {path.relative_to(stage).as_posix()}\n" for path in files(stage))
    (stage / SUMS).write_text(sums)
    staged_zip = Path(temporary) / NAME
    with zipfile.ZipFile(staged_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for path in files(stage):
            info = zipfile.ZipInfo(f"delivery-v{VERSION}/{path.relative_to(stage).as_posix()}",
                                   date_time=(2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            with path.open("rb") as source, archive.open(info, "w", force_zip64=True) as target:
                shutil.copyfileobj(source, target, length=1024 * 1024)
    with zipfile.ZipFile(staged_zip) as archive:
        if archive.testzip() is not None:
            fail("Delivery ZIP CRC failed")
        for info in archive.infolist():
            if info.filename.endswith(".zip") and not zipfile.is_zipfile(io.BytesIO(archive.read(info))):
                fail(f"Corrupt nested ZIP: {info.filename}")
    os.replace(staged_zip, OUTPUT)

report = {
    "version": VERSION,
    "deliverySha256": digest(OUTPUT),
    "deliveryBytes": OUTPUT.stat().st_size,
    "included": len(included) + 2,
    "excluded": len(excluded),
    "excludedByReason": dict(Counter(excluded.values())),
    "qaBundleSha256": digest(QA_BUNDLE),
}
if RESULT:
    Path(RESULT).write_text(json.dumps(report, indent=2) + "\n")
print(f"Delivery PASS: {report['included']} files, {report['deliveryBytes']} bytes, "
      f"{report['excluded']} QA files kept in the external bundle; SHA-256 {report['deliverySha256']}.")
