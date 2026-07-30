# Security policy

## Supported version

Security reports are evaluated for the latest published release candidate and later official releases. Historical alpha artifacts are retained only as test fixtures and are not supported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Send a concise report to `security@loadcomposer.com` with:

- affected version and execution mode (`https://`, local server, or standalone `file://`);
- reproduction steps and a minimal proof of concept;
- expected and observed impact;
- affected browser and operating system; and
- whether any data has been accessed or disclosed.

If `security@loadcomposer.com` is unavailable, use `licensing@loadcomposer.com` and put “SECURITY” in the subject. Do not send secrets, active credentials, unnecessary personal data, or weaponized payloads.

The project will aim to acknowledge a complete report within seven days, assess severity, and coordinate disclosure. These are targets, not a service-level agreement or bounty promise. Please allow a reasonable remediation period before public disclosure.

LoadComposer processes entered planning data locally in the browser and has no application backend, but hosting infrastructure may keep ordinary request logs. Reports about unsupported browsers, inaccurate loading estimates, social engineering, or availability of third-party hosting are normally outside the security scope unless they demonstrate a concrete software vulnerability.
