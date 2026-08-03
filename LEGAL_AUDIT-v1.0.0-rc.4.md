# Legal-file audit — LoadComposer v1.0.0-rc.4

Date: 2026-08-03  
Status: structural and byte-identity audit; not legal advice

`LICENSE`, `LICENSE.it.md`, `NOTICE` and their three public copies are
byte-identical to canonical RC.3:

| File pair | SHA-256 |
|---|---|
| `LICENSE`, `site/legal/LICENSE` | `07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0` |
| `LICENSE.it.md`, `site/legal/LICENSE.it.md` | `8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266` |
| `NOTICE`, `site/legal/NOTICE` | `0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f` |

The legal index still links to `./LICENSE` and `./NOTICE`, without a download
attribute. Exact `_headers` rules set `text/plain; charset=utf-8` and
`Content-Disposition: inline`; cache remains supplied only by `/legal/*`.
There is no LICENSE.txt or NOTICE.txt copy.

`CODE_OF_CONDUCT.md` follows Contributor Covenant 2.1 and uses only
`conduct@loadcomposer.com` for enforcement. The license meaning, permissions,
restrictions, owner, governing-language rule and commercial-licensing terms were
not changed by RC.4.

Automated result: `6/6` canonical byte identities and both inline routes PASS.
