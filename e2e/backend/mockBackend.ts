import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Route } from "@playwright/test";

/**
 * Mocked mode's backend (see docs/adr/0001-mock-backend-data-keep-components-live.md).
 *
 * Answers every request a component makes for backend data (session, user,
 * wallet, SMT records, feed, marketplace, reward tiers) and the card face from
 * the files in ./data, so the suite's results do not depend on what a sandbox
 * account holds. The viewer, the components and the tenant config still load
 * live. Any other request is blocked and recorded: the test then fails and
 * names it, which is how a new endpoint shows up.
 *
 * The data is shared by every tenant: `{{fqdn}}` and `{{coin}}` in it are
 * replaced with the tenant's own.
 */

export interface MockBackendOptions {
  fqdn: string;
  appId: string;
  /** The tenant's points coin (marketplace prices). */
  coin: string;
  /** Origins that load live: the local viewer and the components host. */
  liveOrigins: string[];
}

export interface MockBackend {
  /** Requests nothing answered, as "METHOD url". */
  unmocked: string[];
}

/** Hosts the mock serves itself. */
export const IMAGE_HOST = "img.e2e.test";
export const FACE_HOST = "face.e2e.test";

const DATA = path.join(__dirname, "data");
const FACE_HTML = fs.readFileSync(path.join(__dirname, "face.html"), "utf8");
/** A 1×1 grey PNG for every feed and SMT image. */
const IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8+x8AAr8B3gYJ3jYAAAAASUVORK5CYII=",
  "base64",
);

// The fixtures mirror untyped backend responses; the mock reads a few fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
interface OwnedSmt {
  vatom: Json;
  faces: Json[];
}

function loadData(options: MockBackendOptions) {
  const read = (file: string) =>
    JSON.parse(
      fs
        .readFileSync(path.join(DATA, file), "utf8")
        .replaceAll("{{fqdn}}", options.fqdn)
        .replaceAll("{{coin}}", options.coin),
    );
  return {
    feed: read("feed.json") as Record<string, Json[]>,
    wallet: read("wallet.json") as OwnedSmt[],
    marketplace: read("marketplace.json") as Json[],
    user: read("user.json") as Json,
    assetProviders: read("asset-providers.json") as Json,
    rewardTiers: read("reward-tiers.json") as Json,
  };
}

/** An unsigned JWT: the viewer and the SDK only decode it, the mock never checks it. */
export function fakeJwt(claims: Json): string {
  const part = (value: Json) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", typ: "JWT" })}.${part(claims)}.e2e`;
}

/** A session token valid until 2100 for the mock user. */
export function fakeToken(options: Pick<MockBackendOptions, "fqdn" | "appId">, userId: string): string {
  return fakeJwt({
    platform: "vatomlabs",
    user_id: userId,
    sub: userId,
    fqdn: options.fqdn,
    iss: options.appId,
    is_guest: false,
    activated: true,
    scope: "all",
    exp: 4102444800,
  });
}

/** The viewer's own localStorage session (authService) for the mock user. */
export function mockSession(options: MockBackendOptions): { name: string; value: string }[] {
  const { user } = loadData(options);
  const authUser = {
    id: user.id,
    email: "e2e@example.com",
    name: `${user.properties.first_name} ${user.properties.last_name}`,
    firstName: user.properties.first_name,
    lastName: user.properties.last_name,
  };
  return [
    { name: "refresh_token", value: fakeToken(options, user.id) },
    { name: "auth_user", value: JSON.stringify(authUser) },
  ];
}

const envelope = (payload: unknown) => ({ request_id: "e2e", payload });

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

/** The owned SMTs an inventory request selects (`/v1/user/vatom/inventory`). */
function inventory(wallet: OwnedSmt[], query: Json): OwnedSmt[] {
  // One page holds everything; children (parent_id = an SMT id) are none.
  if ((query.page ?? 1) > 1 || (query.parent_id && query.parent_id !== "*")) return [];
  return wallet.filter(({ vatom }) => {
    const type = vatom["vAtom::vAtomType"];
    return (
      (!query.category || type.category === query.category) &&
      (!query.fqdn || type.publisher_fqdn === query.fqdn) &&
      (!query.template_variation || type.template_variation === query.template_variation)
    );
  });
}

function smtPayload(smts: OwnedSmt[]) {
  return { vatoms: smts.map((s) => s.vatom), faces: smts.flatMap((s) => s.faces), actions: [] };
}

/** The feed items a discover query selects (`/api/feeds/feed/discover`). */
function feedItems(feed: Record<string, Json[]>, request: Json): Json[] {
  const query = request.query ?? {};
  const items = feed[query.category] ?? [];
  const tags: string[] = query["properties.en.tags"]?.$all ?? [];
  const tagged = items.filter((item) => tags.every((tag) => item.properties.en.tags?.includes(tag)));
  // Without statuscheck the backend leaves the per-user status out.
  return request.statuscheck
    ? tagged
    : tagged.map(({ status_check: _status, ...item }) => item);
}

export async function mockBackend(context: BrowserContext, options: MockBackendOptions): Promise<MockBackend> {
  const data = loadData(options);
  const token = fakeToken(options, data.user.id);
  const unmocked: string[] = [];
  const live = (url: URL) => options.liveOrigins.includes(url.origin);

  // Live updates: the platform's socket gets a silent stand-in; the dev
  // server's own socket stays real.
  await context.routeWebSocket(/.*/, (ws) => {
    if (live(new URL(ws.url().replace(/^ws/, "http")))) ws.connectToServer();
  });

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = () => (request.postData() ? JSON.parse(request.postData()!) : {});

    if (live(url) || url.protocol === "data:") return route.fallback();
    if (url.hostname === IMAGE_HOST) return route.fulfill({ contentType: "image/png", body: IMAGE });
    if (url.hostname === FACE_HOST) return route.fulfill({ contentType: "text/html", body: FACE_HTML });

    const p = url.pathname;
    if (method === "POST" && p.endsWith("/v1/access_token")) {
      return json(route, envelope({ access_token: { token, token_type: "Bearer", expires_in: 3600 } }));
    }
    if (method === "GET" && p.endsWith("/v1/user")) return json(route, envelope(data.user));
    if (method === "GET" && p.endsWith("/v1/user/asset_providers")) return json(route, envelope(data.assetProviders));
    if (method === "GET" && p.endsWith("/v1/user/vcoins/balance")) return json(route, envelope([]));
    if (method === "POST" && p.endsWith("/v1/user/vatom/inventory")) {
      return json(route, envelope({ ...smtPayload(inventory(data.wallet, body())), next_token: "" }));
    }
    if (method === "POST" && p.endsWith("/v1/user/vatom/get")) {
      const ids: string[] = body().ids ?? [];
      return json(route, envelope(smtPayload(data.wallet.filter((s) => ids.includes(s.vatom.id)))));
    }
    if (method === "GET" && p.endsWith("/marketplace/items")) {
      const id = url.searchParams.get("item_id");
      return json(route, envelope(data.marketplace.filter((item) => item.id === id)));
    }
    if (method === "POST" && p.endsWith("/api/feeds/feed/discover")) {
      return json(route, envelope({ data: feedItems(data.feed, body()), nextToken: null }));
    }
    if (method === "GET" && /\/reward-tiers-[a-z]+\.json$/.test(p)) return json(route, data.rewardTiers);

    unmocked.push(`${method} ${url.origin}${url.pathname}`);
    return route.abort("blockedbyclient");
  });

  return { unmocked };
}
