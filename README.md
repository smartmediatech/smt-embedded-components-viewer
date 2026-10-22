# SMT Embedded Components - Example Container App

This project demonstrates a **container application** that embeds **SMT Embedded Components** using the `smt-base-bridge` library. The container app handles authentication, passes auth tokens to embedded components, manages navigation, and provides a seamless integration experience.

## Overview

This example showcases:

- **User Authentication**: Login flow with email/password
- **Auth Token Passing**: Securely passing tokens to embedded components
- **Isolated Embeddable Components**: Standalone components that can be embedded independently (Discover, Rewards, Challenges, Giveaways, Card, Reward)
- **Modal Navigation**: Opening detailed views in modals with navigation handling
- **Bridge Communication**: Two-way communication using the `smt-base-bridge` library
- **Logout Handling**: Coordinated logout between container and embedded components

## Live demo

A hosted build of this app runs at
**https://demo.smartmedialabs.io/embedded-smtembed/** against a neutral SMT demo
tenant (Challenges, Rewards, Giveaways, Discover). Ask SMT for a demo login.

## Prerequisites

The **`smt-base-bridge.min.js`** library must be loaded in your HTML to enable communication between the container app and the embedded components.

```html
<script src="./smt-base-bridge.min.js"></script>
```

This library provides the `SMTBaseBridge.ParentBridge` class used to establish communication with the child iframe.

## Running the Example

Requires **Node 20 or newer**.

```bash
yarn install
yarn dev
```

The app will be available at `https://localhost:3000`.

**The components themselves are not part of this repo and are not run locally.**
They are served by SMT from a components hostname, and this app loads them in
iframes from there. So before it will show anything, `public/config.json` needs
the three values SMT gives you:

| Value | What it is |
| --- | --- |
| `smartComponentsHost` | the components hostname for your environment |
| `fqdn` | your publisher identifier |
| `appId` | the app id to authenticate against |

Copy `public/config.example.json` to `public/config.json` and fill those in — see
[Runtime configuration](#runtime-configuration).

The dev server uses HTTPS with a self-signed certificate. Accept the browser
warning for `https://localhost:3000`, and note that the components load from a
**different origin** — if they are served over HTTPS with a certificate your
browser does not trust, you must accept that origin's warning too, by visiting it
directly once. Otherwise the iframes fail to load with no visible error.

## Who configures what

Worth being explicit, because it determines who you ask for a change:

**SMT configures the components.** Branding, colours, typography and fonts,
corner radii, icons, layout, which tabs and reward tiers exist, the currency
name, your allowed embedding origins — and the *content mapping*: which
categories, tags and fields of your content the components read, which tag
marks a featured item, what the challenge sub-nav filters on, and how the
"completed", "coming soon" and "time left" states are derived. All of it lives
in a per-publisher config that SMT authors and publishes to the CDN. The
component fetches it at runtime using the `fqdn` you pass. **There is no file in
this repo, and no query parameter, that changes any of it.** To change your
branding, content mapping or behaviour, ask SMT; it takes effect without you
redeploying anything and without a new component release.

What SMT needs from you for that configuration:

| You provide | SMT turns it into |
| --- | --- |
| Design: colours, corner radii, the two font faces as `.woff2` (or `.otf`) files with licence confirmation, optional custom icons | the theme; fonts are hosted by SMT next to your config, so nothing is needed on your side |
| Your content model: category names, the tag that marks featured items, the tags you use to classify challenges (they become the sub-nav chips), where points, XP, CTA label and badge live on an offer | the content mapping |
| Reward tiers: the tier names in ascending order, and which tag on a reward offer marks its tier | the tier chips and the tier label on reward cards |
| Which components you embed, and whether challenges show your users' *owned* challenges or the full *catalogue* | the per-component behaviour |

See [Content the components read](#content-the-components-read) for what must be
on your offers for each element to appear.

**You configure the container.** This app — authentication, navigation, modals,
loaders, consent, and the values below that tell it which components to load.

Two exceptions that *are* yours, passed per URL: `lang` and `theme` (see
[Language Configuration](#language-configuration)).

## Runtime configuration

No values are compiled in. Hosts, the auth backend, the optional OneTrust domain
id and the map theme all come from a runtime `public/config.json`:

- `public/config.example.json` is committed as a **template containing
  placeholders**, not working values.
- `public/config.json` is gitignored — create it from the example and put your own
  values in it.

```bash
cp public/config.example.json public/config.json
```

The loader (`src/config/viewerConfig.ts`) tries `config.json` first and falls back
to the example. So a fresh clone starts and the UI renders, but **login fails and
the iframes stay empty until you replace the three placeholders** — that is the
expected first-run state, not a bug.

The shape, with the values you must change marked:

```jsonc
{
  "defaultTenant": "example",          // must match a key in "tenants"
  "tenants": {
    "example": {
      "label": "Example Tenant",       // shown in the UI only
      "fqdn": "<your-fqdn>",                                  // ← from SMT
      "appId": "<your-app-id>",                               // ← from SMT
      "smartComponentsHost": "https://<host>/components",     // ← from SMT
      "legacyComponentsHost": "https://<host>/components"
    }
  },
  "auth": {
    "apiBaseUrl": "https://b.smartmedialabs.io",
    "appId": "<your-app-id>"           // ← same id as above
  },
  "mapTheme": { "light": { … }, "dark": { … } }
}
```

Notes on the individual keys:

- **`appId` appears twice** and both must be the same value: `auth.appId` is what
  this app logs in with, and the tenant's `appId` overrides it per tenant if you
  configure several. It must also match the app id in the publisher config SMT
  publishes for your `fqdn` — a mismatch is rejected by the platform and surfaces
  as component failures rather than a login error.
- **`mapTheme` is required even if you do not embed the map.** It is read without a
  fallback, so removing the key stops the whole app from starting. Leave it as-is
  unless you are using the map.
- **`oneTrust` is optional** — omit the key entirely if you do not use OneTrust and
  the consent bridge simply never fires.
- **`legacyComponentsHost`** is only used by the map. Set it the same as
  `smartComponentsHost` unless SMT tells you otherwise.

## Embedded Components

All component URLs follow this pattern:

```
{componentsHost}/{componentName}/?fqdn={fqdn}
```

`{componentsHost}` is the **full URL root** SMT gives you — scheme included, and
already ending in `/components`, for example:

```
https://<host>/components
```

So a complete URL looks like
`https://<host>/components/rewards/?fqdn=<your-fqdn>`. In this app the value is
`smartComponentsHost` in `config.json`; do not prefix it with `https://` again.

Two independent axes, and neither is a path segment:

- **The host carries the environment.** Each hostname is bound to exactly one
  environment, so the URL never contains `sandbox`/`test`/`live`. SMT provides the
  hostname for your environment.
- **`?fqdn=` carries the publisher.** The component fetches
  `<origin>/config/<fqdn>.json` at runtime and configures itself from it —
  branding, theme, layout and business options all arrive that way, which is why
  the same bundle serves every publisher, and why those things are changed by SMT
  rather than by you.

A tenant entry in `config.json` therefore fully specifies one
customer-environment target, and `appendUrlParams` in
`src/context/AppContext.tsx` appends `fqdn` automatically to every component
URL, exactly as it already does for `lang` and `theme`.

**Important**: All component URLs must include a trailing `/` before query parameters.

**Correct**: `{componentsHost}/discover/?lang=es`
**Incorrect**: `{componentsHost}/discover?lang=es` (missing `/` before `?`)

### Common Integration Requirements

All embedded components should be rendered in a `BridgedIframe` and share the same core bridge contract:

- Handle `session.get` so the component can authenticate
- Handle `session.clear` so embedded logout clears the host session
- Support `loader.show` and `loader.hide` for embedded loading states
- Handle `navigation.open` so a component can open an external link in a new tab — a card face's "go to store" button, or an offer whose CTA is an https URL. Components never open URLs themselves; a host that does not answer this request makes those buttons do nothing. See [Opening External Links](#opening-external-links)
- Optionally support `tracking.consent.request` and `tracking.consent.update` if your integration uses OneTrust

Additional bridge features depend on the component:

- Use `navigation.go` when you want the host app to intercept navigation and open modal/detail views
- Use `sizeToContent` for inline, variable-height embeds that should grow with the page
- Avoid `sizeToContent` for fixed-size modal embeds
- Use `component.config.get` and `component.config.update` for components like Map that accept host-provided configuration

### Discover Component

The primary landing experience within the embedded component suite, showing challenges and rewards. Supports navigation to card and reward details via modals.

**URL**: `{componentsHost}/discover/`

**Component-specific notes**:

- Optionally handle `navigation.go` if you want to open card or reward details in host-controlled modals
- An offer whose CTA is an https URL opens through `navigation.open`
- Consider `sizeToContent` when embedding inline in a scrolling page

### Rewards Component

Displays the rewards a user can redeem and the ones they already own. A
featured carousel at the top shows the reward offers carrying your *featured*
tag; a row of chips filters by tier or shows the user's own rewards; the grid
lists the rest. Supports navigation to individual reward details and engaged
cards via modals.

**URL**: `{componentsHost}/rewards/`

**Configured by SMT** (ask SMT to change any of these): the card style, the tabs
and their labels, the tier names and the tag that marks a reward's tier, and
what the cost row shows. Two card styles exist — the original card, and the
*catalogue* card shared with the challenge catalogue (image with label, tier
name above the title, cost row, square call to action).

**Component-specific notes**:

- Optionally handle `navigation.go` if you want to open reward or card details in host-controlled modals
- When a user redeems a reward that costs points, a confirmation dialog is shown within the embedded component before the transaction proceeds — no bridge interaction is needed
- Consider `sizeToContent` when embedding inline in a scrolling page

### Challenges Component

Has two modes, chosen by SMT in your configuration:

- **Owned challenges** — lists the challenges the user has started, with their
  progress. A challenge appears once the user has it.
- **Catalogue** — lists *every available* challenge, with the user's own state
  overlaid on each card: available, in progress (with a progress bar), or
  completed (faded, with a "View" action). A featured carousel at the top shows
  the challenges carrying your *featured* tag; chips derived from the tags on
  your challenges filter the grid; an item count sits below the chips. Each
  card shows the challenge's kind (its tag) above the title, what it earns
  (points, XP, a badge), and a call to action whose label comes from the offer.
  A single label on the image says "Featured" (carousel), or the state
  (grid): "Completed", "Coming soon" for a challenge whose start date is in the
  future, or the time left when the end date is within a week — in hours during
  the last day.

Visitors who are not logged in see the catalogue without any personal state.

**URL**: `{componentsHost}/challenges/`

**Configured by SMT**: the mode, which labels appear, the sub-nav chips and
their per-language labels, what the reward row shows, and which fields on your
content carry each value (see [Content the components read](#content-the-components-read)).

**Component-specific notes**:

- Optionally handle `navigation.go` if you want to open engaged card details in a host-controlled modal
- Consider `sizeToContent` when embedding inline in a scrolling page
- The catalogue reads the whole feed once and filters chips client-side, so
  chip labels are exactly your tag names unless SMT has configured a
  translation for them. A typo in a tag shows up verbatim.

### Giveaways Component

Displays promotions such as sweepstakes, contests, and games that are not directly affiliated with the rewards program. Includes two tabs: **Giveaways** for active promotions and **My Prizes** for prizes the user has won.

**URL**: `{componentsHost}/giveaways/`

**Component-specific notes**:

- Each giveaway card has an optional `cta` property — when set to an HTTPS URL it opens externally through `navigation.open`, when set to a deep link it navigates internally, and when empty the card is rendered without a clickable action
- No additional bridge handlers are required beyond the standard set
- Consider `sizeToContent` when embedding inline in a scrolling page

### Card Component

Displays detailed card information. Requires card ID as query parameter.

**URL**: `{componentsHost}/card/?id={cardId}`

**Component-specific notes**:

- Include the required `id` query parameter
- Do not use `sizeToContent` if rendering inside a fixed-size modal
- Handle `navigation.open` on this iframe as well: a card's face links out through it (for example a "go to store" button), and the card is usually loaded in a second, modal `BridgedIframe` that needs the same handlers as the first

### Reward Component

Shows reward details and redemption options. Requires reward ID as query parameter.

**URL**: `{componentsHost}/reward/?id={rewardId}`

**Component-specific notes**:

- Include the required `id` query parameter
- Do not use `sizeToContent` if rendering inside a fixed-size modal

### Map Component

Displays the standalone map component. Supports the same embedded auth/session contract as the other components and accepts a visual configuration object over the bridge.

> **Availability differs from the other components.** The map is provisioned per
> arrangement rather than being part of the standard set — confirm with SMT that it
> is enabled for your environment before integrating it. If it has not been
> provisioned, the URL below will not serve anything.

**URL**: `{componentsHost}/map/?config_url=map-config.<fqdn>.json`

**Component-specific notes**:

- Pass `config_url`. The map does not read `fqdn`; it loads its publisher from the
  config file named in `config_url`. Without it, the map falls back to the host's
  default publisher, which may not be yours, and your users get authentication errors.
- Use the bare file name. Do not prefix it with `./`: the map does not URL-decode
  the value, so an encoded `.%2F` would request a file that does not exist.
- SMT provisions `map-config.<fqdn>.json` when the map is enabled for you.
- Support `component.config.get` to provide initial map configuration
- Optionally send `component.config.update` for live theme/config changes

The example app demonstrates a simple light/dark theme toggle using:

- `component.config.get` for the initial config
- `component.config.update` for live theme changes

Current config shape:

```typescript
type MapComponentConfig = {
  theme?: {
    mode?: "light" | "dark";
    colors?: {
      accent?: string;
      locationButtonBackground?: string;
      locationButtonForeground?: string;
      pickupRadiusFill?: string;
    };
  };
};
```

## Content the components read

The components render **your** content from the SMT platform. Which field plays
which role is part of the configuration SMT maintains for you, with sensible
defaults; the table shows the defaults, so you know what to fill in. If your
content uses different names, tell SMT and the mapping is changed — the
components themselves never change.

| Shown on the card | Read from your offer (default) | Notes |
| --- | --- | --- |
| Title | `title` | |
| Description | `short_description`, else `description` | |
| Image | `image`; the featured carousel prefers `image_featured` | Featured artwork should not contain a "Featured" label — the component draws it |
| Kind (small line above the title) | the offer's tags | also the sub-nav chips; the featured tag is excluded |
| Featured | the tag SMT configured as *featured* (e.g. `featured`) | case matters |
| Points | custom field `points` | |
| XP | custom field `xp` | display only |
| Badge ("+1 badge") | custom field `badge` = `yes` | |
| Call-to-action label | custom field `cta_label` (per language), else `action_text`, else "Start" / "Redeem" | |
| Time left | the offer's end date, when set | the platform's default open-ended end date shows nothing |
| Coming soon | the offer's start date in the future | |
| Progress bar | custom field `challenge_type` = `progressive` on the offer; the value from the user's own challenge item (`progress_status` / `progress_max`) | per-user progress never lives on the offer |
| Completed | the user's own challenge item has reached `progress_max`, or the platform reports the offer as no longer acquirable for them | |
| Reward tier | a tag on the reward offer matching one of the configured tier names | the tier name shows above the reward title |

Rule of thumb, agreed with SMT: **anything shown before a user starts a
challenge lives on the offer; per-user progress lives on the user's item.**

Fonts, icons, colours and radii are not content: they are part of the theme
SMT configures, and fonts are hosted by SMT alongside your configuration.

## Configuration

### Content Security Policy (CSP)

To embed the components, your parent application must allow frames from the
components origin. Use the **origin only** — scheme and host, no path:

```
frame-src https://<host>
```

Note this is *not* the `smartComponentsHost` value verbatim: that ends in
`/components`, and a CSP source with a path is matched as a path prefix, which is
narrower than intended and a common cause of a silently blank iframe.

Conversely, SMT restricts which pages may frame *your* components — see
[Parent origin](#parent-origin).

### Auth Configuration

Your application must be configured with an **App ID** provided by SMT. This App ID **must match** the App ID in the publisher config the components load (`identity.appId`). Mismatched App IDs will cause authentication and communication failures.

In this example both the App ID and the auth API base URL come from
`config.json` (`auth.appId` / `auth.apiBaseUrl`) rather than being compiled in.

### Parent origin

The components validate the embedding page's origin, and the bridge is pinned to
it. **Register every origin you will embed from with SMT** — including staging and
preview domains. An unregistered origin does not error; the component renders a
neutral, unbranded placeholder with tracking disabled, which looks like a styling
problem rather than a configuration one.

**One publisher identifier serves one embedding origin.** If you embed from two
production domains, you need two `fqdn`s — tell SMT both up front. A single `fqdn`
cannot be shared across origins.

Two related points worth knowing when debugging:

- Origins are matched exactly. `https://www.example.com` and
  `https://example.com` are different origins, as are different ports.
- If your embedding page sends `Referrer-Policy: no-referrer`, Firefox cannot
  report the parent origin at all. The components still render, but tracking is
  disabled for those users. Send an origin-bearing referrer policy if you rely on
  tracking.

### Iframe Permissions

The iframe must have the following permissions enabled via the `allow` attribute:

```typescript
<iframe
  allow="geolocation; camera; microphone; fullscreen; autoplay; clipboard-write; encrypted-media; gyroscope; accelerometer; web-share; xr-spatial-tracking"
/>
```

This is the list the example app sets, and the one to start from. `geolocation`
is what the map component needs; the remainder are permissive defaults that cover
the component set without needing per-component tuning.

If your own policy requires a narrower list, ask SMT which entries your
integration actually needs rather than trimming by inspection — a missing
permission usually presents as a feature quietly doing nothing rather than as an
error.

## Language Configuration

All embedded components support language configuration via the `lang` query parameter in the component URL.

### Language Detection Behavior

The embedded components use the following language detection priority:

1. **Explicit `lang` parameter**: If a `lang` query parameter is provided in the URL, that language will be used
2. **Browser language**: If no `lang` parameter is set, the component will attempt to use the browser's language setting
3. **Fallback**: If neither is available or supported, the component defaults to English (`en`)

### Supported Language Format

Language codes must use an **ISO 639-1 language code** with an optional **ISO 3166-1 alpha-2 regional code**, separated by a hyphen (for example, `en` or `en-US`).

**Examples**:

- `en` - English (generic)
- `en-US` - English (United States)
- `es` - Spanish (generic)
- `fr` - French (generic)
- `de` - German

The following languages are currently supported: `ar`, `da`, `de`, `en`, `es`, `fr`, `id`, `it`, `ja`, `ko`, `nl`, `pt`.

### Usage Examples

```typescript
// Discover component with Spanish
<BridgedIframe
  src={`${componentsHost}/discover/?lang=es`}
  className="w-full h-full"
/>

// Card with language and ID
<BridgedIframe
  src={`${componentsHost}/card/?id=123&lang=de`}
  className="w-full h-full"
/>
```

### Important Notes

- Always include the trailing `/` before query parameters to ensure proper routing
- Language codes are case-insensitive but lowercase is recommended
- Invalid or unsupported language codes will fall back to the browser language or English
- The `lang` parameter can be combined with other query parameters (e.g., `?id=123&lang=es`)

## Bridge Communication

### Bridge Setup

The `BridgedIframe` component (`src/components/BridgedIframe.tsx`) establishes communication with embedded components and handles authentication, navigation, and other requests.

```typescript
useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe || !window.SMTBaseBridge) {
    console.error("Iframe or SMTBaseBridge not available");
    return;
  }

  const childOrigin = new URL(src);

  const bridge = new window.SMTBaseBridge.ParentBridge(iframe, {
    origin: childOrigin.origin,
    meta: {},
  });
  bridgeRef.current = bridge;

  // Register session.get handler - provides access token to embedded components
  bridge.addRequestHandler("session.get", async () => {
    const accessToken = await authService.getAccessToken();
    return { accessToken };
  });

  // Register session.clear handler - handles logout from embedded components
  bridge.addRequestHandler("session.clear", async () => {
    await authService.logout();
    navigate("/login");
    return {};
  });

  // Set iframe src after bridge is configured
  setIframeSrc(src);

  return () => {
    if (bridgeRef.current) {
      bridgeRef.current.removeRequestHandler("session.get");
      bridgeRef.current.removeRequestHandler("session.clear");
    }
  };
}, [src, navigate]);
```

### Communication Flow

1. **Container loads** the embedded component in an iframe
2. **Bridge initialization**: `ParentBridge` is created with the iframe reference and origin
3. **Request handlers registered**: Container registers handlers for `session.get`, `session.clear`, `navigation.go`, `navigation.open`, `loader.show`, `loader.hide`, etc.
4. **Embedded component requests auth**: Calls `session.get` through the bridge
5. **Container responds**: Returns the access token (or refresh token for legacy viewer)
6. **Embedded component authenticates**: Uses the token for API requests
7. **Navigation requests**: Either side can request navigation changes through the bridge
8. **Modal handling**: Container can intercept navigation to open modals with isolated components
9. **Logout coordination**: Either side can initiate logout, which is handled by both

### Passing Auth to Embedded Components

#### Token Types

The `session.get` handler must return either an access token or a refresh token. **Access token mode is recommended for most integrations.**

**Access Token (recommended)**

The container manages the token lifecycle — refreshing expired access tokens and always providing a valid one to the embedded component.

```typescript
bridge.addRequestHandler("session.get", async () => {
  const accessToken = await authService.getAccessToken();
  return { accessToken };
});
```

**Refresh Token**

The embedded component manages its own token lifecycle. Supported, but **not
recommended** — it hands the component a long-lived credential, where an access
token limits the blast radius if it leaks. Prefer the access-token form above
unless SMT has told you otherwise for a specific integration.

```typescript
bridge.addRequestHandler("session.get", async () => {
  const refreshToken = authService.getRefreshToken();
  return { refreshToken };
});
```

### Navigation Handling

The `BridgedIframe` component supports an optional `onNavigation` callback that allows you to intercept and handle navigation requests from the embedded component:

```typescript
onNavigation?: (
  feature: string,
  focus?: string,
  extra?: string,
  params?: Record<string, string | boolean | number>,
) => Promise<
  | {
      feature: string;
      focus?: string;
      extra?: string;
      params: Record<string, string | boolean | number>;
    }
  | undefined
>;
```

- **Return `undefined`**: Prevents the navigation (useful for opening modals instead)
- **Return navigation object**: Approves and potentially modifies the navigation
- **Throw error**: Rejects the navigation request

**Example** (`src/pages/Discover.tsx`):

```typescript
<BridgedIframe
  src={`${componentsHost}/discover/?lang=en`}
  className="w-full h-full"
  onNavigation={async (feature, focus) => {
    if (feature === "engaged" && focus) {
      setModalFocus({ id: focus, type: "card" });
      setShowModal(true);
    } else if (feature === "reward" && focus) {
      setModalFocus({ id: focus, type: "reward" });
      setShowModal(true);
    }
    return undefined;
  }}
  sizeToContent
/>
```

### Opening External Links

Embedded components never open a URL themselves: a component runs in an
iframe and leaves the decision of how to open a link — new tab, in-app
browser, native handler — to the host. Whenever a component needs an external
page opened it sends a `navigation.open` request with the URL in the payload.
This happens when:

- a card's face asks for a website to be opened (a "go to store" or "buy
  tickets" button inside the card);
- a Discover or Giveaways offer has an https URL as its CTA.

The host must register a handler for `navigation.open` on **every**
`BridgedIframe`, including the one that loads the Card component in a modal.
If the handler is missing, the bridge answers `NOT_SUPPORTED` and the button
silently does nothing — there is no fallback inside the component.

The handler in `src/components/BridgedIframe.tsx`:

```typescript
bridge.addRequestHandler("navigation.open", async ({ payload }) => {
  const url = (payload as { url?: unknown } | undefined)?.url;

  // The URL crosses the bridge from the iframe, so treat it as untrusted:
  //  - restrict to http(s), or a `javascript:` URL would execute in this
  //    (host) document rather than the iframe's;
  //  - noopener, or the opened tab can reach back through window.opener and
  //    navigate this page (reverse tabnabbing).
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return new BridgeError(
      "INVALID_PARAMETER",
      "navigation.open requires an http(s) url",
    ).toJson();
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return {};
});
```

Return `{}` once the link has been opened, or a `BridgeError` (as JSON) to
refuse a URL.

### Loader and Alert Handlers

The `BridgedIframe` component handles loader and alert requests from embedded components:

**Loader Handlers** (using SweetAlert2):

```typescript
bridge.addRequestHandler("loader.show", async ({ payload }) => {
  const { label } = payload as { label: string };

  Swal.fire({
    title: label || "Loading...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  return {};
});

bridge.addRequestHandler("loader.hide", async () => {
  Swal.close();
  return {};
});
```

**Alert Handlers** (not supported by default):

```typescript
bridge.addRequestHandler("alert.notify", async () => {
  return new BridgeError("NOT_SUPPORTED", "alert.notify is not supported");
});
```

### Dynamic Iframe Resizing with frame.resize

The `BridgedIframe` component supports dynamic height adjustment based on the embedded content's size. This is useful for components with variable height content that should scroll seamlessly as part of your page rather than having an internal scrollbar.

#### When to Use sizeToContent

Use the `sizeToContent` prop when:

- The embedded component has **variable height content** that changes dynamically
- You want the iframe to **scroll with your page** rather than having its own scrollbar
- The content should feel like a **native part of your page** rather than a separate scrollable area

**Do NOT use** `sizeToContent` when:

- The component has a **fixed, known height**
- You want the iframe to have its **own internal scrollbar**
- The component is displayed in a **modal or fixed-size container**

#### How It Works

**Which components send it.** The main views — Challenges, Rewards, Discover and
Giveaways — report their content height. The Card, Reward and Wearable views do
not: they are meant for fixed-size modals.

1. On load, the component measures its content and sends one `frame.resize`
   request with `{ height }` in pixels.
2. If your page answers it, the component keeps sending whenever its content
   height changes (filtering the list, loading more, opening a section), and drops
   anything that would pin it to the frame height, so the frame can also shrink.
3. If your page has no handler, or answers with an error such as
   `NOT_SUPPORTED`, the component stops after that first request and keeps its
   own internal scrolling. Nothing else changes.
4. Your page sets the iframe's height to the value it receives; your page's
   scrollbar then scrolls the content, with no scrollbar inside the iframe.

**Nothing to enable on the component side**: no query parameter and no config.
Register the `frame.resize` handler before you set the iframe's `src` (as
`BridgedIframe` does), so the first request is not lost. Remove any fixed height
or `overflow` setting on that iframe, other than a sensible initial height to
avoid a jump while it loads.

#### Implementation

```typescript
bridge.addRequestHandler("frame.resize", async ({ payload }) => {
  if (!sizeToContent) {
    return new BridgeError(
      "NOT_SUPPORTED",
      "frame.resize is not supported when sizeToContent is disabled",
    );
  }

  const { height } = payload as { height: number };

  if (typeof height !== "number" || height < 0) {
    return new BridgeError(
      "INVALID_PARAMETER",
      "height must be a positive number",
    );
  }

  if (iframe) {
    iframe.style.height = `${height}px`;
  }

  return {};
});
```

#### Usage Examples

**Inline component** (scrolls with page):

```typescript
<BridgedIframe
  src={`${componentsHost}/discover/?lang=en`}
  className="w-full h-full"
  onNavigation={onNavigation}
  sizeToContent
/>
```

**Modal** (fixed size, do NOT use `sizeToContent`):

```typescript
<BridgedIframe
  src={`${componentsHost}/card/?id=${cardId}&lang=en`}
  className="w-full h-full"
  onNavigation={onNavigation}
/>
```

#### Best Practices

1. **Use for variable content**: Enable `sizeToContent` for components with dynamic, variable-height content
2. **Disable for fixed layouts**: Don't use `sizeToContent` for modals, fixed-height containers, or components with internal scrolling
3. **Performance**: The components send at most one request per animation frame, and only when the height actually changed
4. **Initial height**: Set a reasonable initial height via CSS to avoid layout shift before the first resize
5. **Minimum height**: Consider setting a `min-height` on the iframe to prevent it from collapsing completely

### Component Config Bridge

`BridgedIframe` supports an optional `componentConfig` prop. When provided:

- the iframe responds to `component.config.get` with the current config object
- the parent also pushes updates with `component.config.update` whenever the prop changes

Example:

```typescript
<BridgedIframe
  src={`${componentsHost}/map/?lang=en&config_url=map-config.${fqdn}.json`}
  className="w-full h-full"
  componentConfig={{
    theme: {
      mode: "dark",
      colors: {
        accent: "#111827",
      },
    },
  }}
/>
```

### Logout

Logout can be initiated from either the container or the embedded components:

**Container-Initiated Logout**:

```typescript
const handleLogout = async () => {
  await logout();
  navigate("/login");
};
```

**Embedded Component-Initiated Logout** (handled in `BridgedIframe.tsx`):

```typescript
bridge.addRequestHandler("session.clear", async () => {
  await authService.logout();
  navigate("/login");
  return {};
});
```

### Tracking Consent Integration (OneTrust)

The `BridgedIframe` component integrates with OneTrust to manage user tracking consent and communicate consent status to embedded components.

#### OneTrust Setup

OneTrust is injected at runtime from `config.json` rather than hardcoded in
`index.html`, so the domain id stays configuration:

```json
{
  "oneTrust": {
    "domainScriptId": "<your-onetrust-key>",
    "consentGroup": "C0002"
  }
}
```

Omit the `oneTrust` block entirely and no consent banner is loaded.

#### Bridge Messages for Tracking Consent

**1. Request Handler: `tracking.consent.request`**

Child iframes can request the current consent status:

```typescript
const response = await bridge.sendRequest("tracking.consent.request", {});
// Returns: { canTrack: boolean, isReady: boolean }
```

**Response format:**

- `canTrack`: `true` if user has consented to tracking (OneTrust group C0002), `false` otherwise
- `isReady`: `true` if user has interacted with the OneTrust banner/preference center, `false` otherwise

**Implementation in BridgedIframe:**

```typescript
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const checkOneTrustConsent = useCallback((): {
  canTrack: boolean;
  isReady: boolean;
} => {
  if (!window.OneTrust) {
    return { canTrack: false, isReady: false };
  }

  const hasInteracted = !!getCookie("OptanonAlertBoxClosed");

  const activeGroups = window.OnetrustActiveGroups || "";
  const activeGroupList = activeGroups
    .split(",")
    .map((group) => group.trim())
    .filter((group) => group.length > 0);
  const canTrack = activeGroupList.includes("C0002");

  return {
    canTrack,
    isReady: hasInteracted,
  };
}, []);

bridge.addRequestHandler("tracking.consent.request", async () => {
  return checkOneTrustConsent();
});
```

**2. Push via `tracking.consent.update`**

The parent sends consent updates to child iframes using `sendRequest`:

```typescript
bridgeRef.current.sendRequest("tracking.consent.update", consentStatus);
```

This is sent:

- When OneTrust consent preferences change (via `OnConsentChanged` callback)
- 1 second after iframe initialization (to provide initial status)

#### Consent Status Object

Both messages return/send the same consent status object:

```typescript
{
  canTrack: boolean,  // true if C0002 group is active
  isReady: boolean    // true if user has interacted with OneTrust banner/preference center
}
```

#### OneTrust Consent Groups

The implementation checks for OneTrust group **C0002** (performance/analytics cookies). To use a different group ID, update `checkOneTrustConsent`:

```typescript
const canTrack = activeGroupList.includes(consentGroup); // from config.json oneTrust.consentGroup
```

#### Important Notes

- **Cookie-Based Detection**: The `isReady` flag relies on the `OptanonAlertBoxClosed` cookie, which OneTrust sets when the user interacts with the consent banner or preference center.
- **Robust Group Parsing**: The active groups are parsed into an array to avoid false positives from partial string matches (e.g., "C0002" vs "C00021").
- **Initial Status Delay**: A 1-second delay is used when sending the initial consent status to ensure the child iframe's bridge is ready to receive the message.
- **Automatic Updates**: The parent automatically sends consent updates whenever the user changes their preferences through OneTrust's UI.

## Token Refresh & Access Token Lifecycle

This application implements a robust token management system with automatic refresh token handling. The system uses two types of tokens:

- **Access Token**: Short-lived token used for API requests (stored in memory)
- **Refresh Token**: Long-lived token used to obtain new access tokens (stored in localStorage)

### Security Considerations for Production

**Important**: In this example, the refresh token is stored in `localStorage` for simplicity and demonstration purposes. However, **this is not recommended for production environments** due to XSS (Cross-Site Scripting) vulnerabilities.

For production applications, consider these more secure alternatives:

1. **Backend-Managed Refresh Tokens with HTTP-Only Cookies (Recommended)**:
   - When the cross-domain API returns the refresh token to your frontend, immediately pass it to your host application's backend
   - Store the refresh token server-side as an HTTP-only, Secure, SameSite cookie
   - Your backend handles token refresh requests and returns new access tokens

2. **In-Memory Storage with Token Exchange**:
   - Keep refresh tokens in memory only (lost on page reload)
   - Implement a token exchange mechanism to obtain new refresh tokens when needed

3. **Frontend Database Storage** (e.g., IndexedDB):
   - Store refresh tokens in a client-side database like IndexedDB instead of localStorage
   - **Not ideal** - better than localStorage but significantly less secure than backend storage

### Token Lifecycle Overview

1. **Login**: User authenticates with email/password
2. **Token Storage**: Access token stored in memory, refresh token in localStorage
3. **API Requests**: Access token automatically validated and refreshed if needed
4. **Token Expiration Check**: JWT expiration checked before each request
5. **Automatic Refresh**: Expired access tokens automatically refreshed using refresh token
6. **Session Validation**: Refresh token validated to ensure minimum remaining session time

### Token Management in AuthService

The `authService` (`src/services/authService/index.ts`) manages the complete token lifecycle:

#### Login - Obtaining Tokens

```typescript
async login(credentials: LoginCredentials): Promise<AuthResponse> {
  const payload: ApiLoginPayload = {
    token: credentials.email,
    token_type: "email",
    auth_data: {
      password: credentials.password,
    },
  };

  const response = await fetch(`${API_BASE_URL}/v1/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "App-Id": APP_ID,
    },
    body: JSON.stringify(payload),
  });

  const data: ApiLoginResponse = await response.json();
  const token = data.payload.access_token.token;
  const refreshToken = data.payload.refresh_token.token;

  this.ACCESS_TOKEN = token;
  localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

  return { user, token, refreshToken };
}
```

#### Session Validation

The `isAuthenticated()` method validates the refresh token and ensures at least 5 minutes of remaining session time:

```typescript
isAuthenticated(): boolean {
  const refresh = this.getRefreshToken();
  const isValid = checkJwtToken(refresh, 5 * 60 * 1000);
  return isValid;
}
```

#### Refreshing Access Tokens

When an access token expires, the `refreshAccessToken()` method obtains a new one:

```typescript
async refreshAccessToken(): Promise<string> {
  const refreshToken = this.getRefreshToken();

  if (!checkJwtToken(refreshToken)) {
    throw new Error("Refresh token has expired");
  }

  const response = await fetch(`${API_BASE_URL}/v1/access_token`, {
    method: "POST",
    headers: {
      "App-Id": APP_ID,
      Authorization: `Bearer ${refreshToken ?? ""}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Unauthorized: Invalid refresh token or app ID mismatch");
  }

  const json: Record<string, any> = await response.json();
  const payload = json.payload as { access_token: { token: string } };
  const newAccessToken = payload.access_token.token;

  this.ACCESS_TOKEN = newAccessToken;
  return newAccessToken;
}
```

#### Getting a Valid Access Token

The `getAccessToken()` method ensures you always have a valid access token:

```typescript
async getAccessToken(): Promise<string> {
  let accessToken = this.getToken();

  if (!accessToken || !checkJwtToken(accessToken)) {
    try {
      accessToken = await this.refreshAccessToken();
    } catch (error) {
      throw new Error("Failed to refresh access token. Please login again.");
    }
  }

  return accessToken;
}
```

#### Automatic Token Refresh with smtFetch

The `smtFetch()` method wraps all API calls with automatic token validation and refresh:

```typescript
async smtFetch(url: string, options?: RequestInit): Promise<Response> {
  const accessToken = await this.getAccessToken();

  const headers = {
    ...options?.headers,
    "App-Id": APP_ID,
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}
```

### Token Flow Summary

1. **User logs in** -> Access token (memory) + Refresh token (localStorage) stored
2. **App initializes** -> `AuthContext` checks if refresh token is valid (min 5 min remaining)
3. **API request made** -> `smtFetch()` checks if access token is valid
4. **Access token expired** -> Automatically refreshes using refresh token
5. **Refresh token expired** -> User redirected to login
6. **User logs out** -> Both tokens cleared from memory and localStorage

### Session Restoration in the Container App

The container app uses `AuthContext` (`src/context/AuthContext.tsx`) as the source of truth for authenticated UI state.

On app startup:

1. `AuthContext` checks whether the stored refresh token is still valid
2. If valid, it calls `authService.fetchCurrentUser()` to restore the signed-in user
3. If that request fails, the container clears the local session and treats the user as logged out
4. If no valid refresh token exists, the app remains unauthenticated and the user must log in again

```typescript
useEffect(() => {
  const fetchUser = async () => {
    try {
      const currentUser = await authService.fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to fetch current user, logging out:", error);
      authService.clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (authService.isAuthenticated()) {
    fetchUser();
  } else {
    setLoading(false);
  }
}, []);
```

## License

Apache-2.0
