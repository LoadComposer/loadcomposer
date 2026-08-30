# LoadComposer v1.3.5 test bundle

This bundle contains the self-contained application, build scripts, GitHub workflow definitions, test suite, current v1.3.5 QA results, and current visual evidence used to validate transverse presentation centering.

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

Input admission and historical byte-parity deliberately require the externally supplied approved v1.3.4 delivery. They fail clearly if it is absent:

```bash
LOADCOMPOSER_V134_ZIP=/path/to/loadcomposer-v1.3.4-delivery.zip \
LOADCOMPOSER_V134_ROOT=/path/to/delivery-v1.3.4 \
npm run test:release-input-admission

LOADCOMPOSER_V134_ROOT=/path/to/delivery-v1.3.4 \
npm run test:release-historical
```

Expected canonical ZIP SHA-256:

`2c39d156b4e98b6da9ba27b9ffca6ddfeef088b5d2785cdd1e4211bea8fc6ed1`

The test bundle's own `SHA256SUMS-v1.3.5.txt` covers every payload file except itself.
