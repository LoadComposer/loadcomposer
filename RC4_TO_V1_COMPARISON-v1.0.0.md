# Confronto RC.4 → v1.0.0

Data: 2026-08-08

Base canonica: `loadcomposer-v1.0.0-rc.4-delivery.zip`  
SHA-256: `a9357a18384f95e09dcc3bd8c48c5fab78ea31468671c2e694021d5f2bb0a7bd`

## Esito

La promozione contiene esclusivamente differenze autorizzate A–F. Non sono
state rilevate modifiche inattese, nuove funzionalità o variazioni del
comportamento dell'applicazione. Il confronto usa direttamente l'estrazione
verificata della delivery RC.4 canonica, senza repository Git o fonti esterne.

| Misura | Valore |
|---|---:|
| File base RC.4 | 202 |
| File v1.0.0 prima della sigillatura ZIP | 214 |
| File aggiunti | 65 |
| File eliminati | 53 |
| File modificati sullo stesso path | 29 |
| File byte-identici sullo stesso path | 120 |
| Path differenti complessivi | 147 |
| Differenze inattese | 0 |

## Categorie autorizzate

- **A** — promozione meccanica della versione RC.4 → v1.0.0 (12 path differenti).
- **B** — rinomina degli artefatti versionati (2 path differenti).
- **C** — aggiornamento dei percorsi Cache-Control versionati (1 path differenti).
- **D** — aggiornamento strettamente necessario di test, fixture e ignore (77 path differenti).
- **E** — documentazione e report della release stabile (36 path differenti).
- **F** — rigenerazione di standalone, bundle, manifest e checksum (19 path differenti).

## File aggiunti (65)

| Stato | Path | Categoria |
|---|---|:---:|
| Aggiunto | `CACHE_POLICY_VALIDATION-v1.0.0.md` | E |
| Aggiunto | `CHANGELOG-v1.0.0.md` | E |
| Aggiunto | `DELIVERY_MANIFEST-v1.0.0.txt` | F |
| Aggiunto | `LEGAL_AUDIT-v1.0.0.md` | E |
| Aggiunto | `RC4_TO_V1_COMPARISON-v1.0.0.md` | E |
| Aggiunto | `RELEASE_CHECKLIST-v1.0.0.md` | E |
| Aggiunto | `SHA256SUMS-v1.0.0.txt` | F |
| Aggiunto | `TEST_REPORT-v1.0.0.md` | E |
| Aggiunto | `TRAILER_DIMENSIONS_REVIEW-v1.0.0.md` | E |
| Aggiunto | `WORKFLOW_VALIDATION-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-de-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-en-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-es-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.0.0.md` | E |
| Aggiunto | `docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.0.0.md` | E |
| Aggiunto | `loadcomposer-v1.0.0-test-bundle.zip` | F |
| Aggiunto | `site/assets/loadcomposer-og-v1.0.0.png` | B |
| Aggiunto | `site/downloads/loadcomposer-v1.0.0-standalone.html` | F |
| Aggiunto | `site/downloads/loadcomposer-v1.0.0-standalone.html.sha256` | F |
| Aggiunto | `site/downloads/loadcomposer-v1.0.0-standalone.zip` | F |
| Aggiunto | `site/downloads/loadcomposer-v1.0.0-standalone.zip.sha256` | F |
| Aggiunto | `tests/cache-policy-v1.0.0.mjs` | D |
| Aggiunto | `tests/check-js-syntax-i18n-v1.0.0.mjs` | D |
| Aggiunto | `tests/check-js-syntax-v1.0.0.mjs` | D |
| Aggiunto | `tests/check-node-syntax-v1.0.0.mjs` | D |
| Aggiunto | `tests/compare-print-renders-v1.0.0.mjs` | D |
| Aggiunto | `tests/delivery-packaging-v1.0.0.mjs` | D |
| Aggiunto | `tests/event-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/de.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/en.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/es.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/fr.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/index.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/it.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/nl.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/lang/pt.json` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/loadcomposer-v1.0.0-rc.4-standalone.html` | D |
| Aggiunto | `tests/fixtures/baseline-v1.0.0-rc.4/loadcomposer-v1.0.0-rc.4.html` | D |
| Aggiunto | `tests/functional-parity-v1.0.0.mjs` | D |
| Aggiunto | `tests/geometry-full-parity-v1.0.0.mjs` | D |
| Aggiunto | `tests/hardening-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-catalogs-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-identical-allowlist-v1.0.0.json` | D |
| Aggiunto | `tests/i18n-modular-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-plural-engine-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-plural-source-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-quantity-rendering-v1.0.0.mjs` | D |
| Aggiunto | `tests/i18n-visual-responsive-v1.0.0.mjs` | D |
| Aggiunto | `tests/legal-inline-v1.0.0.mjs` | D |
| Aggiunto | `tests/loadcomposer-regression-v1.0.0.mjs` | D |
| Aggiunto | `tests/orientation-source-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/print-i18n-locales-v1.0.0.mjs` | D |
| Aggiunto | `tests/print-pdf-v1.0.0.mjs` | D |
| Aggiunto | `tests/print-plural-scenarios-v1.0.0.mjs` | D |
| Aggiunto | `tests/repository-release-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/repository-runtime-v1.0.0.mjs` | D |
| Aggiunto | `tests/responsive-v1.0.0.mjs` | D |
| Aggiunto | `tests/scope-freeze-v1.0.0.mjs` | D |
| Aggiunto | `tests/security-xss-v1.0.0.mjs` | D |
| Aggiunto | `tests/stable-scope-audit-v1.0.0.mjs` | D |
| Aggiunto | `tests/trailer-prudential-alerts-v1.0.0.mjs` | D |
| Aggiunto | `tests/version-consistency-v1.0.0.mjs` | D |
| Aggiunto | `tests/visual-refinements-v1.0.0.mjs` | D |
| Aggiunto | `tests/workflow-policy-v1.0.0.mjs` | D |

## File eliminati (53)

| Stato | Path | Categoria |
|---|---|:---:|
| Eliminato | `CACHE_POLICY_VALIDATION-v1.0.0-rc.4.md` | E |
| Eliminato | `DELIVERY_MANIFEST-v1.0.0-rc.4.txt` | F |
| Eliminato | `LEGAL_AUDIT-v1.0.0-rc.4.md` | E |
| Eliminato | `RELEASE_CHECKLIST-v1.0.0-rc.4.md` | E |
| Eliminato | `SHA256SUMS-v1.0.0-rc.4.txt` | F |
| Eliminato | `TEST_REPORT-v1.0.0-rc.4.md` | E |
| Eliminato | `TRAILER_DIMENSIONS_REVIEW-v1.0.0-rc.4.md` | E |
| Eliminato | `WORKFLOW_VALIDATION-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-de-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-en-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-es-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.0.0-rc.4.md` | E |
| Eliminato | `docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.0.0-rc.4.md` | E |
| Eliminato | `loadcomposer-v1.0.0-rc.4-test-bundle.zip` | F |
| Eliminato | `site/assets/loadcomposer-og-v1.0.0-rc.4.png` | B |
| Eliminato | `site/downloads/loadcomposer-v1.0.0-rc.4-standalone.html` | F |
| Eliminato | `site/downloads/loadcomposer-v1.0.0-rc.4-standalone.html.sha256` | F |
| Eliminato | `site/downloads/loadcomposer-v1.0.0-rc.4-standalone.zip` | F |
| Eliminato | `site/downloads/loadcomposer-v1.0.0-rc.4-standalone.zip.sha256` | F |
| Eliminato | `tests/cache-policy-rc.4.mjs` | D |
| Eliminato | `tests/check-js-syntax-i18n-rc.4.mjs` | D |
| Eliminato | `tests/check-js-syntax-rc.4.mjs` | D |
| Eliminato | `tests/check-node-syntax-rc.4.mjs` | D |
| Eliminato | `tests/compare-print-renders-v1.0.0-rc.4.mjs` | D |
| Eliminato | `tests/delivery-packaging-rc.4.mjs` | D |
| Eliminato | `tests/event-audit-rc.4.mjs` | D |
| Eliminato | `tests/functional-parity-v1.0.0-rc.4.mjs` | D |
| Eliminato | `tests/geometry-full-parity-v1.0.0-rc.4.mjs` | D |
| Eliminato | `tests/i18n-catalogs-rc.4.mjs` | D |
| Eliminato | `tests/i18n-identical-allowlist-rc.4.json` | D |
| Eliminato | `tests/i18n-modular-rc.4.mjs` | D |
| Eliminato | `tests/i18n-plural-engine-rc.4.mjs` | D |
| Eliminato | `tests/i18n-plural-source-audit-rc.4.mjs` | D |
| Eliminato | `tests/i18n-quantity-rendering-rc.4.mjs` | D |
| Eliminato | `tests/i18n-visual-responsive-rc.4.mjs` | D |
| Eliminato | `tests/legal-inline-rc.4.mjs` | D |
| Eliminato | `tests/loadcomposer-regression-rc.4.mjs` | D |
| Eliminato | `tests/orientation-source-audit-rc.4.mjs` | D |
| Eliminato | `tests/print-i18n-locales-rc.4.mjs` | D |
| Eliminato | `tests/print-pdf-rc.4.mjs` | D |
| Eliminato | `tests/print-plural-scenarios-rc.4.mjs` | D |
| Eliminato | `tests/rc4-hardening-audit.mjs` | D |
| Eliminato | `tests/rc4-scope-audit.mjs` | D |
| Eliminato | `tests/repository-release-audit-rc.4.mjs` | D |
| Eliminato | `tests/repository-runtime-rc.4.mjs` | D |
| Eliminato | `tests/responsive-rc.4.mjs` | D |
| Eliminato | `tests/scope-freeze-rc.4.mjs` | D |
| Eliminato | `tests/security-xss-rc.4.mjs` | D |
| Eliminato | `tests/trailer-prudential-alerts-rc.4.mjs` | D |
| Eliminato | `tests/version-consistency-rc.4.mjs` | D |
| Eliminato | `tests/visual-refinements-rc.4.mjs` | D |
| Eliminato | `tests/workflow-policy-rc.4.mjs` | D |

## File modificati sullo stesso path (29)

| Stato | Path | Categoria |
|---|---|:---:|
| Modificato | `.github/ISSUE_TEMPLATE/bug.yml` | E |
| Modificato | `.gitignore` | D |
| Modificato | `CHANGELOG.md` | E |
| Modificato | `README.it.md` | E |
| Modificato | `README.md` | E |
| Modificato | `ROADMAP.md` | E |
| Modificato | `VERSION` | A |
| Modificato | `docs/ARCHITECTURE.md` | E |
| Modificato | `docs/CLOUDFLARE_PREVIEW_CHECKLIST.md` | E |
| Modificato | `docs/DEPLOYMENT.md` | E |
| Modificato | `docs/GITHUB_FIRST_PUSH.md` | E |
| Modificato | `docs/QUICK-START.md` | E |
| Modificato | `package-lock.json` | A |
| Modificato | `package.json` | A |
| Modificato | `scripts/build-standalone.mjs` | F |
| Modificato | `scripts/create-delivery-controls.mjs` | F |
| Modificato | `scripts/generate-translation-glossary.mjs` | F |
| Modificato | `scripts/package-standalone.mjs` | F |
| Modificato | `scripts/prepare-release-assets.mjs` | F |
| Modificato | `site/_headers` | C |
| Modificato | `site/index.html` | A |
| Modificato | `site/lang/de.json` | A |
| Modificato | `site/lang/en.json` | A |
| Modificato | `site/lang/es.json` | A |
| Modificato | `site/lang/fr.json` | A |
| Modificato | `site/lang/it.json` | A |
| Modificato | `site/lang/nl.json` | A |
| Modificato | `site/lang/pt.json` | A |
| Modificato | `site/legal/index.html` | A |

## Verifica del perimetro funzionale congelato

- Fixture RC.4: 10/10 file copiati dalla base canonica e verificati con hash
  incorporati nel test di scope.
- Applicazione modulare: equivalenza byte-per-byte dopo la sola normalizzazione
  `1.0.0` → `1.0.0-rc.4`.
- Standalone: equivalenza byte-per-byte dopo la sola normalizzazione della
  versione.
- Geometria e coordinate: 7.542/7.542 confronti superati, zero differenze.
- Scenari funzionali: 35/35 confronti RC.4 → v1.0.0 superati.
- Cataloghi: 7 lingue, 456 chiavi per catalogo; differenze limitate a
  `meta.version` e `translations["meta.documentTitle"]`.
- Profili camion, container, pallet, temi, grafica, stampa e risultati: invariati
  salvo la versione visualizzata e i nomi degli artefatti.

## Audit dei riferimenti RC residui

La ricerca case-insensitive ha coperto `rc.1`, `rc.2`, `rc.3` e `rc.4`
nei file testuali della candidata. Manifest, checksum e questo rapporto sono
esclusi dall'elenco per evitare riferimenti derivati o ricorsivi. Ogni
occorrenza residua appartiene a cronologia, fixture, baseline o confronto;
nessun riferimento è obsoleto e nessun RC è presentato come versione corrente.

### RC.1 (4 path)

| Path | Classificazione |
|---|---|
| `CHANGELOG-v1.0.0-rc.3.md` | cronologia corretta |
| `CHANGELOG.md` | cronologia corretta |
| `RC2_HARDENING_REPORT.md` | confronto corretto |
| `RC2_TO_RC3_COMPARISON-v1.0.0-rc.3.md` | confronto corretto |

### RC.2 (19 path)

| Path | Classificazione |
|---|---|
| `CHANGELOG-v1.0.0-rc.3.md` | cronologia corretta |
| `CHANGELOG.md` | cronologia corretta |
| `NOTICE` | confronto corretto |
| `RC2_HARDENING_REPORT.md` | confronto corretto |
| `RC2_TO_RC3_COMPARISON-v1.0.0-rc.3.md` | confronto corretto |
| `docs/ARCHITECTURE.md` | confronto corretto |
| `site/legal/NOTICE` | cronologia corretta |
| `tests/compare-print-renders-v1.0.0.mjs` | baseline corretta |
| `tests/delivery-packaging-v1.0.0.mjs` | baseline corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/de.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/en.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/es.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/fr.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/index.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/it.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/nl.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/lang/pt.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/loadcomposer-v1.0.0-rc.2-standalone.html` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.2/loadcomposer-v1.0.0-rc.2.html` | fixture corretta |

### RC.3 (21 path)

| Path | Classificazione |
|---|---|
| `.gitignore` | cronologia corretta |
| `CHANGELOG-v1.0.0-rc.3.md` | cronologia corretta |
| `CHANGELOG-v1.0.0-rc.4.md` | cronologia corretta |
| `CHANGELOG.md` | cronologia corretta |
| `RC2_TO_RC3_COMPARISON-v1.0.0-rc.3.md` | confronto corretto |
| `RC3_TO_RC4_COMPARISON-v1.0.0-rc.4.md` | cronologia corretta |
| `RELEASE_CHECKLIST-v1.0.0.md` | confronto corretto |
| `docs/ARCHITECTURE.md` | confronto corretto |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/de.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/en.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/es.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/fr.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/index.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/it.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/nl.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/lang/pt.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/loadcomposer-v1.0.0-rc.3-standalone.html` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.3/loadcomposer-v1.0.0-rc.3.html` | fixture corretta |
| `tests/orientation-source-audit-v1.0.0.mjs` | baseline corretta |
| `tests/scope-freeze-v1.0.0.mjs` | baseline corretta |
| `tests/visual-refinements-v1.0.0.mjs` | baseline corretta |

### RC.4 (28 path)

| Path | Classificazione |
|---|---|
| `CACHE_POLICY_VALIDATION-v1.0.0.md` | confronto corretto |
| `CHANGELOG-v1.0.0-rc.4.md` | cronologia corretta |
| `CHANGELOG-v1.0.0.md` | cronologia corretta |
| `CHANGELOG.md` | cronologia corretta |
| `LEGAL_AUDIT-v1.0.0.md` | confronto corretto |
| `RC3_TO_RC4_COMPARISON-v1.0.0-rc.4.md` | cronologia corretta |
| `RELEASE_CHECKLIST-v1.0.0.md` | confronto corretto |
| `TEST_REPORT-v1.0.0.md` | confronto corretto |
| `docs/ARCHITECTURE.md` | confronto corretto |
| `docs/GITHUB_FIRST_PUSH.md` | confronto corretto |
| `package.json` | baseline corretta |
| `scripts/create-delivery-controls.mjs` | confronto corretto |
| `tests/delivery-packaging-v1.0.0.mjs` | baseline corretta |
| `tests/event-audit-v1.0.0.mjs` | baseline corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/de.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/en.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/es.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/fr.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/index.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/it.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/nl.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/lang/pt.json` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/loadcomposer-v1.0.0-rc.4-standalone.html` | fixture corretta |
| `tests/fixtures/baseline-v1.0.0-rc.4/loadcomposer-v1.0.0-rc.4.html` | fixture corretta |
| `tests/functional-parity-v1.0.0.mjs` | baseline corretta |
| `tests/geometry-full-parity-v1.0.0.mjs` | baseline corretta |
| `tests/legal-inline-v1.0.0.mjs` | baseline corretta |
| `tests/stable-scope-audit-v1.0.0.mjs` | baseline corretta |

## Conclusione

Le 147 differenze di path sono tutte classificate A–F. I 120
file condivisi restanti sono byte-identici. La v1.0.0 è una promozione
meccanica e documentale della RC.4 canonica, con rigenerazione degli artefatti
versionati e nessuna differenza funzionale inattesa.
