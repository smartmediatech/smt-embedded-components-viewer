# Publisher brand spec — `<PROJECT NAME>`

Hand this to SMT. They author the per-publisher config and publish it to the CDN;
the components fetch it at runtime via `?fqdn=`. Nothing in this document is
applied by deploying this repo — see "Who configures what" in the README.

Replace every `<...>` placeholder. Delete sections that do not apply, but say so
explicitly rather than leaving them blank, so defaults are a decision and not an
accident.

---

## 1. Identity and environments

One `fqdn` serves one embedding origin. If you embed from two production domains
you need two fqdns — list them all up front.

| Field | Sandbox | Test | Live |
| --- | --- | --- | --- |
| `fqdn` | `<smt.myprojectsandbox>` | `<smt.myprojecttest>` | `<smt.myproject>` |
| `appId` | `<uuid>` | `<uuid>` | `<uuid>` |
| Components host | `<https://host/components>` | | |
| Embedding origins | `<https://staging.example.com>` | | `<https://www.example.com>` |

Origins are matched exactly — `https://example.com` and `https://www.example.com`
are different, as are different ports. Include preview/staging domains.

The `appId` here must match `identity.appId` in the publisher config and
`auth.appId` in this viewer's `config.json`. A mismatch surfaces as component
failures, not as a login error.

## 2. Colour

Give hex values. State which are required vs. nice-to-have.

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| Brand / primary | `<#RRGGBB>` | `<#RRGGBB>` | |
| Primary foreground (text on primary) | `<#RRGGBB>` | `<#RRGGBB>` | must pass 4.5:1 |
| Accent / interactive | `<#RRGGBB>` | `<#RRGGBB>` | |
| Page background | `<#RRGGBB>` | `<#RRGGBB>` | |
| Surface / card background | `<#RRGGBB>` | `<#RRGGBB>` | |
| Body text | `<#RRGGBB>` | `<#RRGGBB>` | |
| Muted / secondary text | `<#RRGGBB>` | `<#RRGGBB>` | |
| Border / divider | `<#RRGGBB>` | `<#RRGGBB>` | |
| Success | `<#RRGGBB>` | `<#RRGGBB>` | |
| Warning | `<#RRGGBB>` | `<#RRGGBB>` | |
| Error / destructive | `<#RRGGBB>` | `<#RRGGBB>` | |

**Dark mode:** `<supported / not supported>`. The container passes
`?theme=light|dark` per URL, so both palettes are used if you support it. If you
only ship one, say which, and what should happen when the opposite value arrives.

## 3. Typography

| Role | Family | Weight | Size / line-height |
| --- | --- | --- | --- |
| Display / headline | `<Font>` | `<700>` | `<32/40>` |
| Title | `<Font>` | `<600>` | `<24/32>` |
| Body | `<Font>` | `<400>` | `<16/24>` |
| Caption / meta | `<Font>` | `<400>` | `<13/18>` |
| Button label | `<Font>` | `<600>` | `<16/24>` |

- Webfont delivery: `<self-hosted URL / Google Fonts / SMT-hosted>`
- Licence permits SMT to host and serve it: `<yes / no>`
- Fallback stack: `<-apple-system, Segoe UI, sans-serif>`

## 4. Assets

Supply source files (SVG preferred) alongside this document.

- Logo, light background: `<file>`
- Logo, dark background: `<file>`
- Logo mark / square: `<file>`
- Favicon: `<file>`
- Empty-state illustration: `<file / use SMT default>`
- Placeholder / fallback image: `<file / use SMT default>`
- Loader or spinner treatment: `<file / use SMT default>`

Shape language: corner radius `<8px>`, border width `<1px>`, elevation/shadow
`<description or none>`.

## 5. Per-component notes

Cover only the components you embed. This viewer has pages for Discover,
Rewards, Challenges, Giveaways, Marketplace and Map.

### Discover
- Tabs / categories to show: `<...>`
- Card layout preference: `<grid / list>`
- Anything to hide: `<...>`

### Rewards
- Currency display name, singular and plural: `<Coin / Coins>`
- Reward tiers and their labels: `<...>`
- Tier colours or badges: `<...>`

### Challenges
- Progress indicator style: `<bar / ring>`
- States to distinguish: `<locked / active / complete>`

### Giveaways
- Entry states and labels: `<...>`

### Marketplace
- Settlement token address for resale listings on this chain (`payment_token`
  in the Tickets API): `<0x...>`. Required — with none configured, the
  component shows a clear "not configured" error instead of guessing one
- How the host resolves a chain address for `wallet.address.get`: `<...>`.
  Nothing in the platform SDK exposes this today; a real deployment needs its
  own answer before this component can list, cancel, or (later) buy

### Map
See section 6 — the map is the one component whose colours you set yourself.

## 6. Map theme (you own this one, not SMT)

These four colours are set in this repo's `public/config.json` under `mapTheme`
and delivered over the iframe bridge, not by SMT. Decide the values here and
apply them yourself.

```json
"mapTheme": {
  "light": {
    "theme": {
      "mode": "light",
      "colors": {
        "accent": "<#RRGGBB>",
        "locationButtonBackground": "<#RRGGBB>",
        "locationButtonForeground": "<#RRGGBB>",
        "pickupRadiusFill": "<#RRGGBB>"
      }
    }
  },
  "dark": {
    "theme": {
      "mode": "dark",
      "colors": {
        "accent": "<#RRGGBB>",
        "locationButtonBackground": "<#RRGGBB>",
        "locationButtonForeground": "<#RRGGBB>",
        "pickupRadiusFill": "<#RRGGBB>"
      }
    }
  }
}
```

`pickupRadiusFill` sits under map tiles, so it needs enough contrast against the
basemap while staying translucent-looking. `locationButtonForeground` must pass
contrast against `locationButtonBackground`.

`mapTheme` is required even if the map is never embedded — it is read without a
fallback and a missing key stops the app from starting.

## 7. Language and copy

- Languages to support: `<en, es, ...>`
- Default when `lang` is absent: `<en>`
- Any copy overrides (currency name, CTA wording, legal text): `<...>`

## 8. Open questions for SMT

- Please share the publisher config schema, or an existing publisher's config, so
  we can confirm which of the above is configurable and which is fixed.
- Which of these values are per-environment vs. shared across sandbox/test/live?
- What is the turnaround for a config change, and does it require a component
  release?
- What happens to unspecified fields — SMT defaults, or inherited from a base
  theme?
