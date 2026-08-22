# LoadComposer v1.3.0 — Cache policy validation

Result: PASS.

- Mutable page shells (`/`, Download, Legal and their `index.html` forms): `public, max-age=0, must-revalidate`.
- `404.html`: `no-store`.
- Versioned artifacts and clean standalone routes for v1.0.0, v1.1.0, v1.2.0, v1.2.1 and v1.3.0: `public, max-age=31536000, immutable`.
- No broad `/downloads/*` rule.
- No path receives both mutable and immutable directives.
- Exact evaluation: 3 hosts × 61 paths = 183 PASS.

