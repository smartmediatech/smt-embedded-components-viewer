# SMT Embedded Components Viewer

A host page that embeds SMT's components in iframes the way a publisher's site would, used for demos and for testing the components from the outside.

## What a component receives

**Viewer config**:
The viewer's own `config.json`: which tenants it offers and, for each, its fqdn, appId, components host and login API.
_Avoid_: config (unqualified), app config

**Tenant config**:
The per-tenant configuration the components fetch from the components host: theme, layout, card variants, content mapping and backend addresses. Built from global, tenant and environment layers in the components repo; holds no feed items.
_Avoid_: publisher config, remote config, config (unqualified)

**Session**:
The signed-in user's tokens, which the viewer holds and hands to a component over the bridge.
_Avoid_: login, auth state

**Backend data**:
Everything a component fetches with the session: feed items from the Commerce Engine, and the user, wallet and SMT records from the platform API.
_Avoid_: content, data (unqualified)

**Card face**:
The Lab-built HTML page that shows one SMT inside the card modal, loaded from the Lab's CDN.
_Avoid_: face (unqualified), card HTML

## Accessibility suite

**Mocked mode**:
A suite run in which backend data and card faces are answered by fixtures in this repo, while the components and the tenant config stay live.
_Avoid_: offline mode, fake mode

**Live mode**:
A suite run against real sandbox backend data, signed in as a real user.
_Avoid_: real mode, sandbox mode

**Known finding**:
A WCAG failure the suite expects today, recorded with its reason and the task that owns the fix; it may be limited to some tenants or to one data mode.
_Avoid_: exception, allowlist entry, ignore
