"""Exercise production packaging against isolated minimal fixtures, including failures."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
rows = []
with tempfile.TemporaryDirectory(prefix="loadcomposer-package-regression-") as temporary:
    base = Path(temporary)
    source = base / "source"
    (source / "scripts").mkdir(parents=True)
    for name in ["VERSION", "package.json", "package-lock.json", "scripts/browser-runtime.mjs", "scripts/create-delivery-v1.5.0.py"]:
        shutil.copyfile(ROOT / name, source / name)
    historical = io.BytesIO()
    with zipfile.ZipFile(historical, "w") as z:
        z.writestr("historical/evidence.txt", "isolated test fixture")
    (source / "loadcomposer-v1.4.0-test-bundle.zip").write_bytes(historical.getvalue())
    qa = base / "qa.zip"
    with zipfile.ZipFile(qa, "w") as z:
        z.writestr("loadcomposer-v1.5.0-test-bundle/loadcomposer-v1.4.0-test-bundle.zip", historical.getvalue())
    output = base / "delivery.zip"
    env = {**os.environ, "LOADCOMPOSER_DELIVERY_ZIP": str(output), "LOADCOMPOSER_TEST_BUNDLE_ZIP": str(qa)}
    def run():
        return subprocess.run(["python3", str(source / "scripts/create-delivery-v1.5.0.py")], env=env, capture_output=True, text=True)
    valid = run()
    assert valid.returncode == 0, valid.stderr
    before = hashlib.sha256(output.read_bytes()).hexdigest()
    with zipfile.ZipFile(output) as z:
        names = z.namelist()
        assert all(f"delivery-v1.5.0/{name}" in names for name in ["package.json", "package-lock.json", "scripts/browser-runtime.mjs"])
        assert z.testzip() is None
    rows.append({"id": "required-inputs-included", "status": "PASS"})
    for name in ["package.json", "package-lock.json", "scripts/browser-runtime.mjs"]:
        path = source / name
        held = base / (path.name + ".held")
        path.rename(held)
        try:
            out = run()
            assert out.returncode != 0 and "Required build inputs excluded" in out.stderr + out.stdout, out.stderr
            assert hashlib.sha256(output.read_bytes()).hexdigest() == before
            rows.append({"id": "missing-" + name, "status": "PASS", "diagnostic": (out.stderr + out.stdout).strip()})
        finally:
            held.rename(path)
    for name in ["ziBAD001", "probe.tmp", "probe.part", "__pycache__/probe.pyc", ".cache/probe", ".pytest_cache/probe", ".mypy_cache/probe"]:
        path = source / name
        path.parent.mkdir(exist_ok=True)
        path.write_text("temporary regression input")
        try:
            out = run()
            assert out.returncode != 0 and "Unexpected temporary file" in out.stderr + out.stdout, out.stderr
            assert hashlib.sha256(output.read_bytes()).hexdigest() == before
            rows.append({"id": name, "status": "PASS", "diagnostic": (out.stderr + out.stdout).strip()})
        finally:
            path.unlink()
    pkg = source / "package.json"
    original = pkg.read_bytes()
    c = json.loads(original)
    c["devDependencies"]["jsdom"] = "0.0.0"
    pkg.write_text(json.dumps(c))
    try:
        out = run()
        assert out.returncode != 0 and "not synchronized" in out.stderr + out.stdout
        rows.append({"id": "npm-descriptor-mismatch", "status": "PASS"})
    finally:
        pkg.write_bytes(original)
    assert run().returncode == 0
    assert hashlib.sha256(output.read_bytes()).hexdigest() == before
    rows.append({"id": "repeat-archive-identical", "status": "PASS"})
result = {"status": "PASS", "tests": len(rows), "rows": rows}
(ROOT / "hotfix-v01-v1.5.0/packaging-regressions.json").write_text(json.dumps(result, indent=2) + "\n")
print(f"PASS packaging: {len(rows)} required npm input, temporary/cache rejection, synchronization and reproducibility checks")
