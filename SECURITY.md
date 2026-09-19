# Security

## Reporting

Open a
[private security advisory](https://github.com/syedi-code/scribe/security/advisories/new).
Please do not open a public issue for a vulnerability.

There is no bounty and no SLA. This is one person's reading interface.

## What this repository holds

Nothing. scribe has no database, no server-side state and no credentials. Every
row it displays belongs to
[alexandria](https://github.com/syedi-code/alexandria), and every request for
one goes through the Pages Function in `functions/api/[[catchall]].ts`. A clone
of this repository is inert until it is pointed at an alexandria instance.

Two things are worth auditing:

**The proxy forwards identity, and verifies nothing.**
`functions/api/[[catchall]].ts` lifts the Access JWT out of the
`CF_Authorization` cookie and sets it as `cf-access-jwt-assertion` before
forwarding to the worker named in `WORKER_URL`. It does not check the token, and
it should not: alexandria verifies the signature against Cloudflare Access's
JWKS and the audience of its own application, so a forged or replayed assertion
fails there. What the proxy must not do is forward to somewhere other than
alexandria — `WORKER_URL` is declared in `wrangler.toml` rather than in the
Pages dashboard precisely so a deploy cannot silently change it.

**Answers are untrusted text, and citations are the only checked part.** Page
text comes out of scanned books and reaches the model, which writes prose around
it. Everything rendered in an answer is treated as content: the markdown
renderer emits no raw HTML, and a citation is the server's verdict rendered as a
stamp, never something the client decides. If a future change lets model output
choose what a stamp says, that is the bug to look for.

## Known limits

- **The session is the Access cookie.** There is no account system here and no
  logout beyond Cloudflare's. Anyone who can reach the deployment past Access is
  a reader.
- **`console.log` in the proxy names paths and cookie counts.** It logs no
  values, but Pages Function logs are visible to anyone with dashboard access.
- **A signed file URL is handed to the browser** so the scan can be drawn. It
  grants one object key for one hour; see alexandria's `SECURITY.md` for what
  that means.
- **No Subresource Integrity and no CSP.** Everything served is same-origin and
  built from this repository, so there is no third-party script to pin — but a
  CSP would still narrow what an injected string could do.
