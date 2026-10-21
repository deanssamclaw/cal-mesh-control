# cal-mesh-control

A mission-control page for [Cal on the mesh](https://github.com/deanssamclaw/cal-mesh): the radio's health, what Cal has transmitted, 30 days of traffic, and the project's changelog. Next.js on Vercel.

cal-mesh itself runs on rflab, a server in Olathe with the radio plugged into it. This site does not run any of it. It reads two public sources and caches what it reads:

| Section | Source | Refresh |
|---|---|---|
| Health, On the air | `GET /api/state` on cal-mesh's public dashboard | 60 s |
| Messages, last 30 days | `GET /api/stats` | 60 s |
| Changelog | merged pull requests on `deanssamclaw/cal-mesh` (GitHub API) | 5 min |

## How it behaves when rflab is down

The page is regenerated in the background at most once a minute. If a source cannot be reached, regeneration throws and Vercel keeps serving the last good page. Every timestamp that could go stale is computed in the viewer's browser, not baked in at build, and turns into a red **stale** warning past its limit (10 minutes for the radio's status, 15 for the page). A cached page never claims to be fresh.

## What it will not publish

`lib/data.ts` projects each source down to named fields before anything renders. The source API also carries other stations' messages, node ids and decision traces; none of that reaches this site. A direct message's destination is reduced to "Direct". To show a new field, add it to the projection by name.

## Configuration

| Env var | Purpose | Default |
|---|---|---|
| `GITHUB_TOKEN` | GitHub API auth. Unauthenticated calls share Vercel's IP-wide limit of 60/hour. Needs no scopes. | none |
| `CAL_MESH_API` | Base URL of the cal-mesh dashboard | `https://rflab.taildc8b12.ts.net/cal-mesh` |

## Develop

```sh
npm install
npm run dev     # http://localhost:3000; always renders fresh in dev
npm run build   # production build, prerenders against the live API
```

`cacheComponents` is deliberately off; `next.config.ts` says why.

## License

GPL-3.0, same as cal-mesh.
