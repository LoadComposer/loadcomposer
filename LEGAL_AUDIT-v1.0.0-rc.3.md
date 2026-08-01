# Legal audit — LoadComposer v1.0.0-rc.3

Date: 2026-07-31  
Status: operational drafting audit; professional legal review recommended  
Governing license text: `LICENSE` (English)  
Courtesy translation: `LICENSE.it.md`

RC.3 legal delta: none. `LICENSE`, `LICENSE.it.md`, and `NOTICE` are
byte-identical to the canonical RC.2 delivery.

## Executive conclusion

The repository contains a coherent custom source-available licensing package: `LCCL-1.0`, package expression `LicenseRef-LoadComposer-Community-1.0`, copyright notice for Marco Pernigotti, an Italian courtesy translation, notices, a trademark policy, commercial-licensing guidance, contribution terms, contributor grant, security policy, privacy notice, and operational limitations.

The English and Italian licenses contain 18 corresponding numbered sections. Automated checks confirm required concepts, identifiers, owner/contact information, governing language, Italian-law/Verona terms, mandatory-law savings, the 30-day cure mechanism, commercial reservations, derivative/redistribution conditions, trademark limits, and operational disclaimers.

This audit is not a legal opinion. No statement in the repository says or implies independent certification or professional legal review.

## Rights model reviewed

The drafting distinguishes:

- broad free personal, educational, academic, research, evaluation, public-body, nonprofit, and charitable use;
- free Internal Use by businesses and professionals, including for-profit organizations;
- permitted use of outputs in ordinary paid logistics, transport, manufacture, sale, and delivery;
- free, Non-Monetized copying, modification, redistribution, and public hosting under conditions;
- reserved monetization of the software, access, substantial embedding, white-label editions, SaaS, APIs, resale, access-linked advertising/sponsorship/affiliate/data/donation models, and implementation services whose principal value is LoadComposer; and
- the Owner’s exclusive ability to monetize official sites, services, and distribution.

Public derivatives must identify modifications, date and author, retain `LICENSE` and `NOTICE`, provide complete corresponding source, remain free and Non-Monetized, use `LCCL-1.0`, adopt a different name, and avoid the LoadComposer logo or implied endorsement. Unmodified redistribution must preserve version, attribution, official source link, disclaimers, and source access; only documented physical-media and shipping costs may be recovered.

## Mandatory-law safeguards

The text expressly preserves mandatory rights and exceptions, non-excludable consumer protections and venue, and liability that Italian law does not permit parties to exclude, including wilful misconduct and gross negligence. Those savings are important because:

- EU software law provides a harmonized framework and preserves defined lawful-user acts and mandatory exceptions: [Directive 2009/24/EC on the legal protection of computer programs](https://eur-lex.europa.eu/eli/dir/2009/24/oj/eng).
- Italian copyright and moral-right rules require analysis under [Law 22 April 1941, no. 633](https://www.normattiva.it/uri-res/N2Ls?urn%3Anir%3Astato%3Alegge%3A1941-04-22%3B633~art20%21vig=).
- Liability exclusions, standard terms, and specific approval of burdensome clauses require review under the [Italian Civil Code](https://www.normattiva.it/uri-res/N2Ls?urn%3Anir%3Astato%3Acodice.civile%3A1942-03-16%3B262=).
- Consumer venue, transparency, remedies, and unfair-term rules require review under the [Italian Consumer Code](https://www.normattiva.it/uri-res/N2Ls?%21vig=urn%3Anir%3Astato%3Adecreto.legislativo%3A2005-09-06%3B206).
- Digital-content rules may apply to some future distribution models, including certain services supplied against personal data rather than money: [Directive (EU) 2019/770](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A32019L0770).

These sources were reviewed for issue spotting, not as a substitute for advice on the final facts or the current consolidated Italian text.

## Privacy and hosting review

The application performs calculations in the browser, has no application backend, and contains no tracker, analytics script, advertising script, remote font, or telemetry endpoint. Theme and language preferences use browser `localStorage`. The privacy notice distinguishes application behavior from technical logs that Cloudflare or another host may keep.

The official Garante materials recognize that technical storage/access and tracking uses require different analysis; deployment configuration and any future additions should be checked against the then-current rules: [Garante clarification on cookies](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/4006878) and [Garante cookie guidelines](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).

No consent banner is included because the verified release sets only functional language/theme preferences and includes no analytics or advertising. A production operator must still document its hosting logs, retention, security, controller identity, contacts, and any provider relationship.

## Contributor and provenance review

`CLA.md` leaves ownership with the contributor and grants the Owner a worldwide, perpetual, irrevocable, non-exclusive, royalty-free, transferable, sublicensable copyright license. The grant covers modification, distribution, source and executable availability, incorporation, `LCCL-1.0`, commercial editions, hosted services, and future licensing. It includes a limited necessary-claims patent grant and a moral-rights savings clause.

The Contributor License Agreement is intentionally labeled an operational draft. Corporate authority, employee inventions, moral rights, patent retaliation, future-license scope, privacy of contributor records, and evidence of assent should be reviewed before accepting material external contributions.

## Points requiring professional review before publication

1. **Licensor identity and title chain:** confirm Marco Pernigotti owns or has adequate grants for all code, translations, logo files, favicon, screenshots, tests, equipment data, and documentation.
2. **License characterization and enforceability:** confirm that `LCCL-1.0` implements the intended source-available/noncommercial boundary in every target jurisdiction without unintended exhaustion, competition, tax, or consumer consequences.
3. **Assent:** decide whether download, hosted use, contribution, and commercial enquiries require click-through acceptance, versioned records, or separately accepted terms.
4. **Italian standard terms:** assess whether Articles 1341–1342 of the Civil Code require specific written approval of venue, termination, liability, commercial restrictions, or other burdensome clauses in particular channels.
5. **Consumer and digital-content law:** review transparency, conformity remedies, updates, withdrawal, mandatory venue, unfair terms, free services supplied against data, and language requirements for any consumer-facing distribution.
6. **Liability and safety:** calibrate the EUR 100 fallback cap and disclaimers for wilful misconduct, gross negligence, death/personal injury, product liability, professional users, operational reliance, and transport/safety statutes.
7. **Commercial boundary:** test SaaS, advertising, sponsorship, donations, affiliate links, implementation consulting, embedded use, APIs, resellers, and ordinary logistics services against concrete intended business models.
8. **Derivative-license mechanism:** review the LCCL-only/source-availability condition, no-additional-restrictions language, private-modification exception, physical-cost recovery, termination, and 30-day reinstatement.
9. **Trademark and domain policy:** verify registered/unregistered rights, territorial strategy, nominative-use wording, fork renaming, enforcement process, and official-domain ownership.
10. **CLA:** review contributor authority, employee/contractor rights, patent grant, moral rights under Italian law, sublicensing, future relicensing, signatures, minors, privacy records, and organizational contributors.
11. **Privacy and Cloudflare:** identify the production controller, complete contact details, lawful bases, Cloudflare roles, international transfers, log retention, security events, data-subject rights, and whether a cookie/local-storage notice or consent mechanism is required.
12. **Security contact and process:** confirm that the listed mailboxes exist, define retention and disclosure handling, and decide whether a vulnerability safe-harbor statement is appropriate.
13. **Translations:** obtain qualified legal-linguistic review of `LICENSE.it.md` while retaining the English-governs clause.
14. **Third-party notices:** complete a dependency, data-source, logo, font, and toolchain provenance review and add any required attribution before publication.

## Automated audit result

- English numbered sections: `18/18`.
- Italian corresponding sections: `18/18`.
- Required legal/community files: present.
- License identifier and package expression: consistent.
- Copyright owner and commercial contact: consistent.
- Positive claims of independent certification or professional legal review: absent.
- Application trackers, analytics, remote scripts, and remote fonts: absent.
- Status: `PASS` for structural and consistency checks; professional substantive legal review remains recommended.
