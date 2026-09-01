# LoadComposer v1.3.6 test bundle

This bundle contains the self-contained application, deterministic Legal/About/Guide/standalone builders, GitHub workflow definitions, test suite, current v1.3.6 QA results, and current visual evidence used to validate SEO/discovery routes and transverse presentation centering. Run `npm run test:seo` for the current About, Guide, metadata, example, image, sitemap, and offline-discovery checks.

## Normal CI

No external previous-release delivery ZIP is required:

```bash
npm ci
npm test
npm run test:hardening
npm run test:path-portability
npm run test:transverse-centering
npm run test:workflow-policy
```

The dedicated presentation regression is also available directly:

```bash
npm run test:transverse-centering
```

## Release-only QA

Input admission and historical byte-parity deliberately require the externally supplied approved v1.3.5 delivery. They fail clearly if it is absent:

```bash
LOADCOMPOSER_V135_ZIP=/path/to/loadcomposer-v1.3.5-delivery.zip \
LOADCOMPOSER_V135_ROOT=/path/to/delivery-v1.3.5 \
npm run test:release-input-admission

LOADCOMPOSER_V135_ROOT=/path/to/delivery-v1.3.5 \
npm run test:release-historical
```

Expected canonical ZIP SHA-256:

`658999470be397526632786c09d481938e19af0267e29ed10924c5c3b733be92`

The test bundle's own `SHA256SUMS-v1.3.6.txt` covers every payload file except itself.
