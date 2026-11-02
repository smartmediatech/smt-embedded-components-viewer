# Accessibility e2e (local only)

Playwright + [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
checks of this viewer against a tenant's **sandbox** components, for what the
components' Storybook cannot see: the host page, the iframe boundary and the
modals the viewer opens. Target: WCAG 2.2 AA.

It runs on your machine only (no CI job): it needs a signed-in sandbox user.

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
task that owns the fix. The suite fails on anything **not** in it. For the
keyboard, focus, reflow and modal checks it also fails when a listed finding no
longer happens, so the entry gets removed with the fix. Axe findings that did
not show up are only reported as an annotation (the sandbox data changes what
axe sees).

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

The suite serves this repo's viewer with the tenant's **hosted** `config.json`
(intercepted in the browser, so nothing is written to `public/`) and the
session you saved.

### Signing in

Tests skip, with a message, when there is no saved login or it has expired.
Save one (the file goes outside the repo, readable by you only):

```sh
E2E_EMAIL=… E2E_PASSWORD=… yarn test:e2e:login
```

A Playwright storage state saved by logging in to the hosted demo viewer of the
same tenant works as well: the suite copies its session to the local origin.

### Options

| Variable | Default | |
| --- | --- | --- |
| `E2E_TENANT` | `palermofcsandbox` | A key of `tenants.ts`. |
| `E2E_STORAGE_STATE` | the tenant's file in `~/.config/smt-verify/` | Saved login (Playwright storage state). |
| `E2E_VIEWER_CONFIG` | the tenant's hosted `config.json` | Viewer config: an https URL or a local path. |
| `E2E_PORT` | `4173` | Dev server port. |
| `E2E_BASE_URL` | | Test an already running viewer at this URL instead of starting one. |
| `E2E_WORKERS` | `3` | Parallel workers. The components come from the shared sandbox. |

Never point it at a live (production) tenant.
