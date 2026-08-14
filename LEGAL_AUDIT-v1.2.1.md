# Legal-file audit — LoadComposer v1.2.1

Date: 2026-08-14  
Status: structural and byte-identity audit; not legal advice

The v1.2.1 change affects only the presentation and localization of the Legal
index shell. The seven linked public documents are copied from their canonical
root sources and are byte-identical:

| Canonical/public pair | SHA-256 |
|---|---|
| `LICENSE`, `site/legal/LICENSE` | `07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0` |
| `LICENSE.it.md`, `site/legal/LICENSE.it.md` | `8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266` |
| `NOTICE`, `site/legal/NOTICE` | `0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f` |
| `TRADEMARKS.md`, `site/legal/TRADEMARKS.md` | `5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490` |
| `COMMERCIAL-LICENSING.md`, `site/legal/COMMERCIAL-LICENSING.md` | `59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4` |
| `PRIVACY.md`, `site/legal/PRIVACY.md` | `13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28` |
| `SECURITY.md`, `site/legal/SECURITY.md` | `41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076` |

The controlling English license, informational Italian translation, notices,
trademark policy, commercial terms, privacy model, security process, owner,
warranty and liability language are unchanged. The exact public inline headers
for LICENSE and NOTICE are preserved.

The Legal shell now uses the product logo at normal header scale, native
language and theme selectors, seven enabled languages, shared
`loadcomposer.language` and `loadcomposer.theme` preferences, system-theme
following in Auto mode, a `1080 px` shell, an `860 px` readable content column,
and Home/Download/Privacy/repository footer links. It performs no automatic
remote runtime request. Automated identity, inline-route, `21` language/theme
and `10` viewport checks all pass.
