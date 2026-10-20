---
title: 'Deploy BeachSafe on Vercel Services under one domain'
type: 'chore'
created: '2026-10-20'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'eee729debfe71f0bb77dc6cc777156d971fa2e04'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository currently has a Vercel config only inside `Frontend/` and a separate Render deployment guide. The requested single-domain deployment needs a root Vercel Services definition that builds the actual Vite and Express apps together, preserves API routes, and connects the backend securely to Atlas.

**Approach:** Configure a root Vercel Services project with independently rooted `Frontend/` and `Backend/` services. Route `/api` and `/api/*` to Express before routing all other public paths to the Vite SPA, use same-origin API calls, and document backend-only MongoDB configuration and deployment/verification steps.

## Boundaries & Constraints

**Always:** Preserve the existing UI and API behavior, MongoDB operations, local development workflows, and user files. Route the original `/api/...` paths unchanged because Express already defines them. Only expose the backend through `/api` ingress. Keep all secrets out of source control and frontend builds; configure Atlas access through the backend service environment. Do not add service bindings unless a server-side service-to-service call is discovered.

**Ask First:** Changing hosting providers, introducing authentication, or changing application features/data behavior.

**Never:** Do not replace application logic with demo data, remove unrelated files, run destructive seeds, or commit/push changes without a separate request.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| API request | `GET /api/health`, `/api/beaches`, `/api/search-history`, or another existing `/api/*` route | Request reaches Express with the original path and method | Backend retains existing route-specific responses |
| API root | `GET /api` without a trailing path | Request reaches Express's existing API root, not the SPA | Keep an explicit exact `/api` rewrite |
| Frontend deep link | `GET /beaches/example` | Vite service returns `index.html` for client-side routing | Service-scoped SPA fallback handles unknown static paths |
| Database connection | Backend service has `MONGODB_URI` configured in Vercel | Existing Mongoose connection and health endpoint report Atlas state | Missing/unreachable database must remain explicit; never expose URI in frontend output |
| Local frontend | `VITE_API_URL` unset | Frontend uses same-origin `/api`; Vite local proxy continues forwarding to port 5001 | Local startup remains supported |

</frozen-after-approval>

## Code Map

- `Frontend/vercel.json` -- existing frontend-only Vercel configuration to replace with the root Services configuration.
- `Frontend/src/api.js` -- currently permits a cross-domain `VITE_API_URL` override.
- `Frontend/vite.config.js` -- local `/api` proxy to port 5001.
- `Frontend/package.json` -- Vite build and UI dependencies; no Tailwind dependency is currently declared.
- `Backend/server.js` -- Express routes, CORS, Mongo connection, PORT handling, and server startup.
- `Backend/package.json` -- Express/Mongoose dependencies and API startup command.
- `Backend/.env.example` -- local environment names and development defaults.
- `README.md` -- existing Render/Vercel deployment guidance to replace with single-project Vercel Services instructions.

## Tasks & Acceptance

**Execution:**
- [x] `vercel.json` -- define Frontend and Backend services with correct roots/entrypoint, ordered `/api` and `/api/*` backend ingress, and frontend fallback -- make one Vercel project serve both services.
- [x] `Frontend/src/api.js` -- use same-origin `/api` without a public backend URL override -- keep requests on the current deployment domain.
- [x] `Backend/server.js` and `Backend/package.json` -- ensure the existing Express app is compatible with Vercel service startup while preserving the local `npm start` flow and PORT behavior -- let Vercel invoke the app without changing API behavior.
- [x] `Frontend/vercel.json`, `Backend/.env.example`, and `README.md` -- remove conflicting per-frontend deployment config and document service configuration, beta caveat, exact Vercel settings, private `MONGODB_URI`, and verification -- ensure instructions match actual capabilities and app behavior.

**Acceptance Criteria:**
- Given the root Vercel project configuration, when a request targets `/api` or `/api/...`, then it routes to the Backend service before the frontend catch-all and retains its path.
- Given any non-API path including a nested client-side route, when requested on the deployment domain, then it is served by the Frontend service and resolves through the Vite SPA fallback.
- Given the deployed app, when the frontend performs existing API calls, then requests use the same-origin `/api` path and no database credentials or backend hostname are bundled into frontend assets.
- Given `MONGODB_URI` is configured only for the Backend service, when `/api/health` is called, then the existing health response reflects the MongoDB connection state.
- Given local development configuration, when root scripts start both applications, then Vite still proxies `/api` to the local Express port.

## Spec Change Log

## Design Notes

Vercel Services route top-level rewrites in order and preserve the original path, so the `/api` namespace is routed to the backend without duplicating or renaming Express endpoints. The Vite service needs its own catch-all rewrite to `/index.html`; the root catch-all targets that service only after API routes. No frontend-to-backend binding is needed because the browser calls the public same-origin API path. The Express app remains the exported Vercel entrypoint; standalone `app.listen` is skipped when `VERCEL=1`. Inspection found no authentication implementation or Tailwind dependency in the current manifests/source; deployment work must not invent either.

## Verification

**Commands:**
- `npm --prefix Frontend run build` -- expected: Vite production build succeeds.
- `node --check Backend/server.js` -- expected: backend syntax is valid.
- `npm --prefix Backend run start` with a local port and no database -- expected: Express starts and existing health/fallback responses remain explicit.
- `vercel dev` when the CLI is available -- expected: `/api/health`, `/api`, and a nested frontend route dispatch to the correct service.

**Manual checks (if no CLI):**
- Validate root `vercel.json` against Vercel's Services schema and inspect its rewrite order and service roots.
- Inspect production frontend assets to verify API calls remain `/api` and no secret or hostname is embedded.
- Vercel CLI is not installed in this workspace, so `vercel dev` and an actual account deployment were not run; service routing was validated structurally against Vercel's published Services examples.

## Suggested Review Order

**Service routing**

- Start with the one-domain route table and service roots.
  [`vercel.json:1`](../vercel.json#L1)
- Check the Express entrypoint exports the app but does not bind a serverless listener.
  [`server.js:1486`](../Backend/server.js#L1486)
- Confirm all browser API calls use the same-origin prefix.
  [`api.js:4`](../Frontend/src/api.js#L4)

**Deployment operations**

- Review the Atlas, Vercel service, environment, and custom-domain setup steps.
  [`README.md:47`](../README.md#L47)
- Confirm the local environment example contains only safe defaults.
  [`.env.example:1`](../Backend/.env.example#L1)
