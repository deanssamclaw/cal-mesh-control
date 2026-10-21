// Everything this site shows comes through here, and only the fields named in the projections
// below ever reach a page. That is the leak guard: the source API carries strangers' messages,
// node ids and traces; this site publishes Cal's own transmissions, counts and health, and a
// field has to be added here by name before it can appear anywhere.

const MESH_API = process.env.CAL_MESH_API ?? "https://rflab.taildc8b12.ts.net/cal-mesh";
const REPO = "deanssamclaw/cal-mesh";

export const MESH_PAGE = `${MESH_API}/`;
export const REPO_URL = `https://github.com/${REPO}`;

// rflab answers in milliseconds locally, but its Tailscale Funnel has been measured at 14 s for a
// 6 KB response and stalling past 30 s; /api/state is ~260 KB. Regeneration runs in the
// background, so a visitor never waits on this; it only bounds how long a refresh may try.
const TIMEOUT_MS = 50_000;

const BUILDING = process.env.NEXT_PHASE === "phase-production-build";

async function getJSON<T>(url: string, revalidate: number, headers?: HeadersInit): Promise<T> {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return (await res.json()) as T;
}

// At runtime a failed source THROWS: Next then keeps serving the last good page and retries on
// the next request, which is what we want when rflab is down. At build there is no last good
// page, so a failure becomes null and the section says so instead of failing the deploy.
async function load<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    if (!BUILDING) throw e;
    // Swallowed for the page, never for the build log: say which source failed and why.
    const cause = e instanceof Error && e.cause ? ` (cause: ${String(e.cause)})` : "";
    console.warn(`[cal-mesh-control] source unavailable at build: ${String(e)}${cause}`);
    return null;
  }
}

// ---- source shapes (only what we read) -------------------------------------------------------

type RawState = {
  status: {
    ts: string;
    uptime_s: number;
    connected: boolean;
    transport: string;
    node: { longName: string; id: string };
    metrics: { battery?: number; voltage?: number; chUtil?: number; airUtilTx?: number };
    firmware?: string;
  };
  bridge: { state: string };
  responder: { enabled: string };
  totals: { sent: number; recv: number };
  sent: { ts: string; dest: string; channel: number; text: string; source?: string }[];
  learning: { health: { state: string; reason?: string; last_run?: string; flags?: string[] } };
};

type RawStats = {
  days: { date: string; replied: number; skipped: number; model_replies: number; from_code: number }[];
};

type RawPull = { number: number; title: string; merged_at: string | null; html_url: string };

// ---- what pages get ----------------------------------------------------------------------------

export type Transmission = {
  ts: string;
  source: "responder" | "presence" | "noaa" | "other";
  broadcast: boolean;
  privateChannel: boolean;
  text: string;
};

export type Health = {
  asOf: string;
  radio: { name: string; connected: boolean; transport: string; firmware: string | null };
  power: { battery: number | null; voltage: number | null };
  airtime: { chUtil: number | null; airUtilTx: number | null };
  // status.uptime_s is the bridge process's uptime (it matches rflab's boot), not the radio's.
  bridge: { state: string; uptimeS: number };
  responderOn: boolean;
  learn: { state: string; reason: string | null; lastRun: string | null };
  totals: { sent: number; heard: number };
};

export type Day = { date: string; answered: number; notAnswered: number };

export type Change = { number: number; title: string; mergedAt: string; url: string };

const SOURCES = new Set(["responder", "presence", "noaa"]);

function project(s: RawState): { health: Health; sent: Transmission[] } {
  const m = s.status.metrics ?? {};
  return {
    health: {
      asOf: s.status.ts,
      radio: {
        name: s.status.node.longName,
        connected: s.status.connected,
        transport: s.status.transport,
        firmware: s.status.firmware ?? null,
      },
      power: { battery: m.battery ?? null, voltage: m.voltage ?? null },
      airtime: { chUtil: m.chUtil ?? null, airUtilTx: m.airUtilTx ?? null },
      bridge: { state: s.bridge.state, uptimeS: s.status.uptime_s },
      responderOn: s.responder.enabled === "true",
      learn: {
        state: s.learning.health.state,
        reason: s.learning.health.reason ?? null,
        lastRun: s.learning.health.last_run ?? null,
      },
      totals: { sent: s.totals.sent, heard: s.totals.recv },
    },
    // A direct message's destination is a node id; it is reduced to "not a broadcast" here.
    sent: s.sent.map((r) => ({
      ts: r.ts,
      source: (SOURCES.has(r.source ?? "") ? r.source : "other") as Transmission["source"],
      broadcast: r.dest === "^all",
      privateChannel: r.channel !== 0,
      text: r.text,
    })),
  };
}

export async function getMesh() {
  return load(async () => project(await getJSON<RawState>(`${MESH_API}/api/state`, 60)));
}

export async function getDays(): Promise<Day[] | null> {
  return load(async () => {
    const s = await getJSON<RawStats>(`${MESH_API}/api/stats`, 60);
    return s.days
      .map((d) => ({ date: d.date, answered: d.replied, notAnswered: d.skipped }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

export async function getChanges(): Promise<Change[] | null> {
  // Unauthenticated GitHub allows 60 calls/hour per IP and Vercel's IPs are shared, so a token
  // is set in the project env. It needs no scopes: the repo is public.
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return load(async () => {
    const pulls = await getJSON<RawPull[]>(
      `https://api.github.com/repos/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=50`,
      300,
      headers,
    );
    return pulls
      .filter((p): p is RawPull & { merged_at: string } => p.merged_at !== null)
      .sort((a, b) => b.merged_at.localeCompare(a.merged_at))
      .slice(0, 15)
      .map((p) => ({ number: p.number, title: p.title, mergedAt: p.merged_at, url: p.html_url }));
  });
}
