# LoadComposer v1.3.4 test bundle

This bundle contains the self-contained application, build scripts, GitHub workflow definitions, test suite, current v1.3.4 QA results, and current visual evidence used to validate the Dark Reader compatibility release.

## Normal CI

No external previous-release delivery ZIP is required:

```bash
npm ci
npm test
npm run test:hardening
npm run test:path-portability
npm run test:workflow-policy
```

The dedicated compatibility regression is also available directly:

```bash
npm run test:dark-reader
```

## Release-only QA

Input admission and historical byte-parity deliberately require the externally supplied approved v1.3.3 delivery. They fail clearly if it is absent:

```bash
LOADCOMPOSER_V133_ZIP=/path/to/loadcomposer-v1.3.3-delivery.zip \
LOADCOMPOSER_V133_ROOT=/path/to/delivery-v1.3.3 \
npm run test:release-input-admission

LOADCOMPOSER_V133_ROOT=/path/to/delivery-v1.3.3 \
npm run test:release-historical
```

Expected canonical ZIP SHA-256:

`c972c4663dddb54d17a97052035b997d8d807e21d79630161321a0d0a6d85911`

The test bundle's own `SHA256SUMS-v1.3.4.txt` covers every payload file except itself.
