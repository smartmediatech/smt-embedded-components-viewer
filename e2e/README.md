# Accessibility e2e

Playwright + [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
checks of this viewer against a tenant's **sandbox** components, for what the
components' Storybook cannot see: the host page, the iframe boundary and the
modals the viewer opens. Target: WCAG 2.2 AA.

## Data modes

The components and the tenant config always load live from the tenant's
sandbox: a component release or a tenant config change that breaks WCAG must
show up. Where the backend data comes from is set by `E2E_DATA`
(why: [ADR 0001](../docs/adr/0001-mock-backend-data-keep-components-live.md)):

| `E2E_DATA` | Backend data | Login | Use |
| --- | --- | --- | --- |
| `mocked` (default) | `e2e/backend/`: feed, user, wallet, SMT records, marketplace, reward tiers, and a stand-in card face | None: the suite makes up a session | CI, and every local run |
| `live` | The tenant's sandbox, as a saved user | Saved login (see below) | Checking real content, e.g. Lab card faces |

In mocked mode any request the mock does not answer fails the test and names
the URL, so the results never depend on a sandbox account. Live mode is not
read-only: opening a Discover or giveaway card the user does not own acquires
it.

## What it checks

For each component tab (Discover, Rewards, Challenges, Giveaways; the map is
out of scope):

| Test | What |
| --- | --- |
| axe | The host page and every iframe in it (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, the same tags as the components' Storybook gate). |
| keyboard | Tab from the header into the component iframe, through it and out again; then Shift+Tab back. Fails if focus never gets in or out, or sticks on one element. |
| 2.4.11 | Makes the header `position: sticky` (as a publisher's site would), Tabs both ways through the iframe and fails if a focused element ends up entirely behind the header. |
| reflow | No horizontal scroll on the host page or inside the iframe at 320 px (1.4.10) and at 640 px (1280 px at 200% zoom: Playwright has no browser zoom, so a narrower viewport stands in for it). |
| modal | Opens a modal from the first card with Enter, runs axe with it open, and checks dialog semantics, focus moving in, focus staying in, Escape from inside the modal's iframe, and focus returning to the card. |

## Known findings

`known-findings.ts` lists today's failures, each with the reason and the Asana
task that owns the fix. The suite fails on anything **not** in it, and also
when a listed finding no longer happens, so the entry gets removed with the
fix. One exception: in live mode a listed axe finding that does not show up is
only reported as an annotation, because live data changes what axe sees.

An entry can be limited to some tenants (`tenants`: their tenant configs
differ, e.g. in contrast) or to one data mode (`onlyIn: "live"`: it comes from
live content such as a Lab card face).

## Running it

```sh
yarn install
yarn playwright install chromium   # once
yarn test:e2e
```

Playwright starts the dev server (`webpack serve`) over https on port 4173
(`E2E_PORT`), or reuses one already running there. It has to be https: the
components only allow https frame ancestors. The report is in
`playwright-report/` (`yarn playwright show-report`).

The suite serves this repo's viewer with the tenant's **hosted** viewer
`config.json` (intercepted in the browser, so nothing is written to `public/`).

### Mocked data

`e2e/backend/data/` holds one dataset for every tenant (`{{fqdn}}` and
`{{coin}}` are filled in per tenant), kept to what the checks need: two
challenges, two rewards, a giveaway, the three SMTs they open, and the
marketplace items. `mockBackend.ts` answers the requests; `face.html` is the
card face every modal shows.

When a components release starts calling something new, the failing test names
the request. To see what the real backend answers, run that test in live mode
with `--trace on` and open the trace (`yarn playwright show-trace <trace.zip>`,
Network tab); then add the smallest response that works, with made-up ids and
no tokens or personal data.

### Signing in (live mode)

In live mode tests skip, with a message, when there is no saved login or it has
expired. Save one (the file goes outside the repo, readable by you only):

```sh
E2E_EMAIL=… yarn test:e2e:login
```

Sign-in is by emailed code, so this opens a browser window: type the code
there. Without `E2E_EMAIL`, sign in any way you like in that window.

A Playwright storage state saved by logging in to the hosted demo viewer of the
same tenant works as well: the suite copies its session to the local origin.

### Options

| Variable | Default | |
| --- | --- | --- |
| `E2E_TENANT` | `palermofcsandbox` | A key of `tenants.ts`. |
| `E2E_DATA` | `mocked` | `mocked` or `live`, see [Data modes](#data-modes). |
| `E2E_STORAGE_STATE` | the tenant's file in `~/.config/smt-verify/` | Saved login (Playwright storage state), live mode only. |
| `E2E_VIEWER_CONFIG` | the tenant's hosted `config.json` | Viewer config: an https URL or a local path. |
| `E2E_PORT` | `4173` | Dev server port. |
| `E2E_BASE_URL` | | Test an already running viewer at this URL instead of starting one. |
| `E2E_WORKERS` | `3` | Parallel workers. The components come from the shared sandbox. |

Never point it at a live (production) tenant.
