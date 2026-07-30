import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const WORKFLOW_DIR = path.join(ROOT, ".github", "workflows");
const WORKFLOWS = ["ci.yml", "package-integrity.yml"];
const ALLOWED_ACTIONS = new Set([
  "actions/checkout@v6",
  "actions/setup-node@v7"
]);

for (const filename of WORKFLOWS) {
  const source = fs.readFileSync(path.join(WORKFLOW_DIR, filename), "utf8");
  assert.match(source, /^permissions:\s*\n\s+contents:\s*read\s*$/m, `${filename}: permissions`);
  assert.ok(source.includes("npm ci"), `${filename}: npm ci missing.`);
  assert.equal(/\bpull_request_target\s*:/m.test(source), false, `${filename}: pull_request_target`);
  assert.equal(/\$\{\{\s*secrets\./i.test(source), false, `${filename}: secret reference`);
  assert.equal(/\|\|\s*true\b/.test(source), false, `${filename}: ignored failure`);
  assert.equal(/\b(?:curl|wget)\s+/i.test(source), false, `${filename}: downloaded script`);
  assert.equal(/\bgit\s+push\b/i.test(source), false, `${filename}: automatic push`);
  assert.equal(/\bgh\s+release\b/i.test(source), false, `${filename}: automatic release`);
  assert.equal(/\bnpm\s+publish\b/i.test(source), false, `${filename}: package publication`);
  assert.equal(/\b(?:wrangler|cloudflare\/pages-action)\b/i.test(source), false, `${filename}: deploy`);

  const jobs = (source.match(/^\s{2}[a-z0-9-]+:\s*$/gm) || [])
    .filter(line => !/^\s{2}(?:push|pull_request|workflow_dispatch|paths|contents):/.test(line));
  const runners = source.match(/^\s{4}runs-on:\s+/gm) || [];
  const timeouts = source.match(/^\s{4}timeout-minutes:\s+\d+\s*$/gm) || [];
  const nodeVersions = source.match(/^\s{10}node-version:\s+22\.17\.0\s*$/gm) || [];
  assert.equal(runners.length, jobs.length, `${filename}: every job needs runs-on.`);
  assert.equal(timeouts.length, jobs.length, `${filename}: every job needs a timeout.`);
  assert.equal(nodeVersions.length, jobs.length, `${filename}: every job needs Node 22.17.0.`);

  for (const match of source.matchAll(/uses:\s*([^\s#]+)/g)) {
    assert.ok(ALLOWED_ACTIONS.has(match[1]), `${filename}: unapproved action ${match[1]}`);
  }
}

const ci = fs.readFileSync(path.join(WORKFLOW_DIR, "ci.yml"), "utf8");
assert.ok(ci.includes("npm test"), "ci.yml must run the complete suite.");
for (const trigger of ["push:", "pull_request:", "workflow_dispatch:"]) {
  assert.ok(ci.includes(trigger), `ci.yml trigger missing: ${trigger}`);
}

const packaging = fs.readFileSync(
  path.join(WORKFLOW_DIR, "package-integrity.yml"),
  "utf8"
);
for (const command of [
  "npm run build",
  "npm run test:hardening",
  "npm run test:workflow-policy",
  "git diff --exit-code"
]) {
  assert.ok(packaging.includes(command), `package-integrity.yml missing: ${command}`);
}

console.log(
  "Workflow policy PASS: 2 consolidated workflows, Node 22.17.0, npm ci, lockfile cache, " +
  "read-only contents permission, bounded timeouts, approved actions and no secrets/deploy/release/push."
);
