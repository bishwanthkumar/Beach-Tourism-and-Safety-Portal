---
title: 'Deploy BeachSafe with Vercel, Render, and MongoDB Atlas'
type: 'chore'
created: '2026-10-20'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd9c61e5b57f678d4fa95ba17b5a5569ff111a890'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository contains a React/Vite frontend and Express/Mongoose API, but its deployment instructions still refer to the removed `client/` and `server/` folders, and the Vercel API rewrite points to a fixed unrelated host. A production deployment needs the frontend, API, and MongoDB data store connected using the current `Frontend/` and `Backend/` layout.

**Approach:** Prepare the repository for Vercel (frontend), Render (API), and MongoDB Atlas (database), with accurate setup, environment-variable, seed, and verification instructions. The user will create and configure provider accounts and supply private credentials through provider dashboards; no cloud resources or secrets are created by this change.

## Boundaries & Constraints

**Always:** Preserve current worktree changes. Use the actual `Frontend/` and `Backend/` directories. Keep MongoDB connection strings and other secrets out of source control. Ensure production frontend requests reach the configured Render API, CORS permits the deployed Vercel origin, and the SPA fallback supports nested routes. Document how to confirm the API is connected to Atlas rather than demo fallback data.

**Ask First:** Changing hosting providers, exposing credentials, or performing destructive database operations.

**Never:** Do not claim to have deployed provider resources without access. Do not hard-code provider URLs or credentials. Do not run the seed script against a database containing records the user wants to keep; it deletes and recreates beach, facility, and alert data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Production frontend build | Vercel builds `Frontend/` with `VITE_API_URL` set to the Render API base URL | Vite build succeeds; API requests target Render; SPA routes load directly | Deployment guide identifies the required variable and provider build settings |
| API/database connection | Render starts `Backend/` with `MONGODB_URI` and `CLIENT_ORIGIN` configured | `/api/health` reports MongoDB connected and the deployed frontend origin is allowed | Guide explains checking configuration and Atlas network access; never treat fallback data as a successful database deployment |
| Missing database configuration | `MONGODB_URI` is absent or Atlas is unreachable | Existing API fallback behavior remains unchanged | Document that `mongoReady` must be true before considering database deployment complete |
| Initial catalog seed | Fresh Atlas database, before user data is added | Seed command populates beach, facility, and alert data | Warn that seeding clears and replaces those collections; do not seed an existing populated deployment |

</frozen-after-approval>

## Code Map

- `README.md` -- local setup and user-facing deployment walkthrough; currently uses stale directory names.
- `package.json` -- root install and development scripts; currently target stale directory names.
- `Frontend/vercel.json` -- Vercel build output and client-side route fallback; currently contains a fixed API destination.
- `Frontend/src/api.js` -- frontend API base URL behavior.
- `Backend/server.js` -- Express port, CORS, MongoDB health status, and `/api/health`.
- `Backend/.env.example` -- local API environment-variable template.
- `Backend/seed.js` -- initial data seeding behavior and destructive collection replacement.
- `render.yaml` -- Render API service definition using `Backend/` as its root directory.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- update root install and dev scripts to use `Frontend/` and `Backend/` -- keep common workflows functional after the directory restructure.
- [x] `Frontend/vercel.json` and `Frontend/src/api.js` -- remove the stale hard-coded proxy and configure a production API URL without breaking local `/api` proxying or SPA routing -- ensure browser calls reach the deployed API.
- [x] `render.yaml` -- define the Render web service rooted at `Backend/`, its install/start commands, health-check path, and dashboard-supplied secrets -- make API setup reproducible without committing credentials.
- [x] `Backend/server.js` -- return an unsuccessful HTTP health status when MongoDB is unavailable while preserving fallback behavior on data routes -- prevent Render from reporting a database-disconnected service as healthy.
- [x] `README.md` and `Backend/.env.example` -- document Vercel, Render, Atlas creation/configuration, environment values, deployment order, safe initial seeding, preview configuration, and health verification -- make instructions match the actual repository.

**Acceptance Criteria:**
- Given the repository root, when the documented install and development commands are run, then they target `Frontend/` and `Backend/`.
- Given valid provider configuration, when Vercel builds and serves the frontend, then nested frontend routes work and frontend API requests reach the configured Render service.
- Given Render is configured with a reachable Atlas URI and the deployed Vercel origin, when `/api/health` is checked, then it reports `mongoReady: true` and MongoDB as the database.
- Given Render cannot connect to MongoDB, when its `/api/health` check runs, then it returns HTTP 503 while existing data routes retain their fallback behavior.
- Given the Atlas URI is private, when the deployment files and documentation are reviewed, then no real credentials are present in tracked files.
- Given a user follows the deployment guide, when they provision Atlas, Render, and Vercel in the stated order, then each required setting and verification step is explicitly identified.

## Spec Change Log

## Design Notes

Vercel serves static Vite output, so the frontend should call the API directly using `VITE_API_URL` rather than relying on the existing fixed proxy rewrite. Keep the local Vite `/api` proxy and default API base URL usable for local development. Render and Atlas accounts, domain names, credentials, and network-access policy remain user-managed deployment settings.

## Verification

**Commands:**
- `npm --prefix Frontend run build` -- expected: Vite production build succeeds.
- `node --check Backend/server.js` -- expected: backend syntax check succeeds.
- `npm --prefix Backend pkg get name` and `npm --prefix Frontend pkg get name` -- expected: package commands resolve to the current application directories.

**Manual checks (if no CLI):**
- Confirm the generated production bundle contains the configured API URL; confirm disconnected MongoDB returns HTTP 503 from `/api/health` while `/api` still returns HTTP 200.
- Inspect the deployment guide's SPA rewrite, Render settings, Atlas settings, preview origins, seed warning, and health-check expectations.

## Suggested Review Order

**Production connection**

- Start with the provider sequence, environment values, and verification steps.
  [`README.md:45`](../README.md#L45)
- Confirm browser requests use the configured API URL and local `/api` remains the default.
  [`api.js:3`](../Frontend/src/api.js#L3)
- Confirm Render health is unsuccessful until MongoDB is connected.
  [`server.js:684`](../Backend/server.js#L684)
- Review the Render service root, commands, health check, and dashboard-only settings.
  [`render.yaml:1`](../render.yaml#L1)

**Frontend routing and local workflows**

- Verify Vercel keeps client-side deep links working without a hard-coded API target.
  [`vercel.json:5`](../Frontend/vercel.json#L5)
- Check root scripts target the current application directories.
  [`package.json:6`](../package.json#L6)
- Confirm local environment examples contain no live database credentials.
  [`.env.example:1`](../Backend/.env.example#L1)

**Database safety**

- Review the initial seed warning against the collections the script replaces.
  [`seed.js:14`](../Backend/seed.js#L14)
