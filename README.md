# BeachSafe — India Beach Safety Portal

A MERN-stack beach safety portal for beaches across India. The app supports beach search, beach detail pages, live weather, marine conditions, safety status, alerts, lifeguard data, nearby facilities, safety map, emergency support, Tamil/Hindi/Telugu/English UI, a personalized beach plan, beach watch, and community hazard reporting.

## Stack and layout

- `Frontend/`: React, Vite, React Router, Leaflet, and Lucide
- `Backend/`: Node.js, Express, and Mongoose API
- Database: MongoDB (local for development or MongoDB Atlas)
- Hosting: Vercel for the frontend and Render for the API

## Local development

From the repository root, install the root development tool and both applications:

```bash
npm install
npm run install-all
```

Alternatively, install dependencies separately:

```bash
npm install --prefix Backend
npm install --prefix Frontend
```

Copy `Backend/.env.example` to `Backend/.env`. Use a local MongoDB instance or set `MONGODB_URI` to an Atlas connection string. The example values start the API on port `5001` and allow the local Vite origin `http://localhost:5173`.

Start both applications from the repository root:

```bash
npm run dev
```

Or start them in separate terminals:

```bash
npm --prefix Backend run dev
npm --prefix Frontend run dev
```

The Vite development server proxies `/api` requests to `http://localhost:5001`. Open the frontend URL shown by Vite, normally `http://localhost:5173`.

## Deploy to MongoDB Atlas, Render, and Vercel

No provider account, database, or deployment is created by this repository. Supply private values through provider dashboards only; never commit `.env` files or credentials.

### 1. Create and configure MongoDB Atlas

1. Create an Atlas project and cluster, then create a database user with a strong password and only the permissions the application needs.
2. In **Network Access**, allow connections from the Render service's outbound IP ranges for its region (check Render's service dashboard/documentation). Prefer stable or static outbound IPs when available. Do not leave Atlas open to all addresses; if a temporary `0.0.0.0/0` rule is unavoidable, use a strong database password and remove the rule as soon as a narrower rule is possible.
3. Get the cluster connection string and select/create the `beachsafety` database. Replace the URI placeholders with the database user's values. URL-encode any special characters in the username or password. Keep this URI private.

### 2. Create the Vercel project and note its origin

Import this repository into Vercel and set the **Root Directory** to `Frontend`. The Vercel configuration uses `npm run build` and publishes `dist`; the rewrite to `/index.html` supports direct navigation to nested SPA routes.

Note the exact production origin (scheme and host only, for example `https://your-app.vercel.app`). You will set this as Render's `CLIENT_ORIGIN`. Do not include a path or trailing slash. Add any custom production domain here too if it will be used.

If you use Vercel Preview deployments, set `VITE_API_URL` for the Preview environment too and add each stable preview origin you use to Render's comma-separated `CLIENT_ORIGIN`. CORS allows only the configured exact origins (apart from local development); per-deployment preview URLs are not automatically trusted.

### 3. Deploy the API on Render

Create a Render Blueprint from the repository root using `render.yaml`, or configure a Node web service manually with:

- **Root Directory:** `Backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`

Set these service environment variables in Render's dashboard:

- `MONGODB_URI`: the private Atlas connection string from step 1.
- `CLIENT_ORIGIN`: the exact Vercel production origin from step 2. For multiple origins, separate the origins with commas.

The Blueprint marks both values `sync: false`, so they must be supplied through the dashboard and are not stored in the repository. Render provides `PORT` automatically. After deployment, note the API's HTTPS service URL.

### 4. Configure and deploy the Vercel frontend

In Vercel project settings, add this environment variable for the Production environment (and Preview if you use preview deployments; include `/api` at the end):

```text
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

Replace the example host with the Render service URL, with no trailing slash after `/api`. The frontend uses this value for direct browser-to-API calls. For local development, leave it unset: the default remains `/api`, which Vite proxies to the local backend.

Deploy or redeploy the Vercel project after setting the variable; Vite embeds it at build time. If the Vercel production domain changes, update Render's `CLIENT_ORIGIN` and redeploy/restart the API.

### 5. Verify the API and Atlas connection

Open this endpoint in a browser or request it with `curl`, substituting the Render service URL:

```bash
curl https://<your-render-service>.onrender.com/api/health
```

Confirm the endpoint returns HTTP 200 with `"mongoReady":true`, `"database":"MongoDB"`, and `"mongoConfigured":true`. If Atlas is unavailable or not configured, the health check returns HTTP 503 with `"database":"fallback demo data"`; check the Render environment values, Atlas user/URI, Atlas Network Access, and Render logs. Other API routes keep their existing demo fallback behavior. Also open the Vercel site and test a nested route and an API-backed page.

## Safe initial data seeding

Seed only a newly created, otherwise empty database, before it contains any records that need to be kept. From `Backend/`, after configuring the environment to point at that fresh database, run:

```bash
npm run seed
```

**Warning:** `Backend/seed.js` deletes and recreates the `Beach`, `Facility`, and `Alert` collections. Do not run it against a populated database or any deployment whose data must be preserved. This guide does not run the seed command.

## Core demo flow

Home → search an Indian beach → beach alert notification → beach detail → live weather and marine conditions → personalized beach plan → alerts → lifeguard → nearby facilities → safety map → emergency support → report a hazard.

## Notes

- Weather and marine conditions are retrieved live from Open-Meteo through the Express backend.
- Hazard, lifeguard, and facility records are seeded application data until connected to an official or authorized source.
- The safety indicator uses a transparent demo rule engine. It is an information summary, not an official declaration that a beach is safe.
- For production, replace demo records with authoritative agency feeds and authorized staff updates.
