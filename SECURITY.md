# Security policy

## Supported versions

The latest published minor release of each package receives fixes.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's security
advisories: <https://github.com/svarbhanu/grahan/security/advisories/new>.
Do not open a public issue for anything you believe is exploitable.

You can expect an acknowledgement within a week. The packages have zero
runtime dependencies and do no I/O, so the practical attack surface is
malformed input — which is validated at every public API boundary — but
reports of any kind are welcome.

## Release integrity

Releases are published from GitHub Actions via npm trusted publishing
(OIDC): no long-lived npm tokens exist, and every published version
carries a provenance attestation you can verify on its npm package page
or with `npm audit signatures`.
