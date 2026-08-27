# LoadComposer v1.3.3 test bundle

This bundle contains the self-contained application, build scripts, GitHub workflow definitions, test suite, fixtures, current v1.3.3 QA results and current visual evidence used to validate the Legal UX release.

## Normal CI

No external historical delivery ZIP is required:

```bash
npm ci
npm test
npm run test:hardening
npm run test:workflow-policy
```

## Release-only QA

Input admission and historical byte-parity deliberately require the externally supplied canonical v1.3.2 delivery. They fail clearly if it is absent:

```bash
LOADCOMPOSER_V132_ZIP=/path/to/loadcomposer-v1.3.2-delivery.zip \
LOADCOMPOSER_V132_ROOT=/path/to/delivery-v1.3.2 \
npm run test:release-input-admission

LOADCOMPOSER_V132_ROOT=/path/to/delivery-v1.3.2 \
npm run test:release-historical
```

Expected canonical ZIP SHA-256:

`145bdacbb8dd9c81af486c7393b6392123f66369f66959d4a0c5bbf99723813f`

The test bundle's own `SHA256SUMS-v1.3.3.txt` covers every payload file except itself.
