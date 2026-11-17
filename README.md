# MINIMA Status

The MINIMA-branded build of [Uptime Kuma](https://github.com/louislam/uptime-kuma),
running at status.minimaworks.be.

## How it works

- `master` is an exact copy of upstream. It is never edited here; the nightly
  workflow keeps it in sync.
- This branch (`minima`, the default branch) holds only what is ours:
  - `branding/` - the icons and `apply.mjs`, which brands a clean upstream
    checkout: page title, app name, header, setup, about and 404 pages, the
    product name in every translation, icons and the accent colour.
  - `.github/workflows/minima-release.yml` - every night it takes the newest
    stable upstream release in the tracked major version, applies the
    branding, builds with upstream's own Dockerfile and pushes
    `ghcr.io/minima-solutions/uptime-kuma:<version>-minima` and `:latest`.
    Then it asks Dokploy to redeploy (secret `DOKPLOY_STATUS_DEPLOY_URL`).

Because the branding is applied at build time, an upstream update never
conflicts with it. If upstream moves something the script relies on, the
script stops with a clear message and nothing is published: fix the rule in
`branding/apply.mjs` and run the workflow again (Actions, "MINIMA Status
release", Run workflow).

## Common tasks

- **Build a specific version:** run the workflow with `version` set, e.g.
  `2.5.11`. It does not move `:latest`.
- **Move to a new major version (3.x):** change `TRACK_MAJOR` in the
  workflow once you have read the upstream release notes.
- **Try the branding locally:**
  `git clone --branch 2.5.11 https://github.com/louislam/uptime-kuma /tmp/kuma && node branding/apply.mjs /tmp/kuma`
- **Roll back:** in Dokploy, set the image to an earlier
  `ghcr.io/minima-solutions/uptime-kuma:<version>-minima` and deploy.

Uptime Kuma is MIT licensed; its license and copyright notices are kept in
the image.
