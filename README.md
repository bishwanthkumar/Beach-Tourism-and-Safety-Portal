# BeachSafe — India Beach Safety Portal

A MERN-stack beach safety portal for beaches across India. The app supports beach search, beach detail pages, live weather, marine conditions, safety status, alerts, lifeguard data, nearby facilities, safety map, emergency support, Tamil/Hindi/Telugu/English UI, a personalized beach plan, beach watch, and community hazard reporting.

## Stack and layout

- `Frontend/`: React, Vite, React Router, Leaflet, and Lucide
- `Backend/`: Node.js, Express, and Mongoose API
- Database: MongoDB (local for development or MongoDB Atlas)
- Hosting: one Vercel Services project and domain for the frontend and API

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

The root `npm run dev` command also requires the root `npm install` above (for `concurrently`). If you only install the two application folders, start Backend and Frontend using the separate-terminal commands below.

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

## Deploy to Vercel Services with MongoDB Atlas

The root `vercel.json` configures separate Vercel Services for `Frontend/` and `Backend/` in one Vercel project. The Backend uses Vercel's Express framework detection and runs `npm install`; the Frontend uses Vite. [Vercel Services](https://vercel.com/docs/services) is currently in Beta; confirm it is available for your account before deployment. Both services ship in the same deployment and use one public domain.

### 1. Configure MongoDB Atlas

1. Create an Atlas project and cluster, then create a database user with a strong password and only the permissions the application needs.
2. In Atlas **Network Access**, allow connections from Vercel according to the current Vercel networking guidance for your plan and region. If a broad `0.0.0.0/0` rule is required for your deployment, use a strong database password and restrict the database user's permissions; do not treat the connection string as public.
3. Get the Atlas connection string and use the `beachsafety` database. URL-encode any special characters in the database username or password.

### 2. Create the single Vercel project

1. Import this GitHub repository as one Vercel project.
2. Keep the project **Root Directory** at the repository root. Do not set it to `Frontend/`; root `vercel.json` declares the two service roots.
3. Deploy the project. The frontend service uses Vite and serves deep links through its service-scoped SPA rewrite. Requests to `/api` and `/api/*` are routed first to the Express backend with their original paths, matching the existing Express routes.
4. In **Project Settings → Domains**, add your custom domain and follow Vercel's DNS instructions. The `vercel.app` production domain also serves both services.

### 3. Configure the backend environment

In the Vercel project settings, add this environment variable to the **Backend service only** for each environment you deploy (Production, and Preview if needed):

```text
MONGODB_URI=<private MongoDB Atlas connection string>
```

Do not add `MONGODB_URI` as a `VITE_*` variable, to the frontend service, or to any tracked file. Vite embeds `VITE_*` values in browser assets. No frontend API URL variable is needed: the browser calls same-origin `/api`. In Vercel, the service invokes the exported Express app directly; `PORT` with a default of `5001` is used only for standalone local startup. `CLIENT_ORIGIN` is not required for same-origin browser requests; it remains available for local cross-origin development.

The backend is publicly routed only by the root `/api` and `/api/*` rewrites. Other paths go to the frontend service. Do not add a service binding: frontend browser requests use the public same-domain route, and there are no server-side frontend-to-backend calls in this app.

The existing API paths include `GET /api/health`, `GET /api`, `GET /api/beaches`, `GET /api/beaches/:id`, `GET /api/beaches/:id/full`, `GET /api/beaches/:id/facilities`, `GET|POST /api/search-history`, and `POST /api/reports`. The router preserves these paths; the API root `/api` is routed explicitly as well.

### 4. Verify the deployment

1. Open `https://<your-project-domain>/api/health`.
2. Confirm HTTP 200 and JSON with `"mongoReady":true`, `"database":"MongoDB"`, and `"mongoConfigured":true`. If MongoDB is unavailable, the health route returns HTTP 503; check that `MONGODB_URI` is present on the Backend service and that Atlas network access allows the connection.
3. Open the project root and a client-side deep link such as `/beaches/<id>`. Confirm each renders the frontend and the app's API requests use the same domain with `/api/...`.
4. Check that frontend build assets contain no Atlas URI or database password.

For local routing that matches Vercel Services, install the Vercel CLI and run `vercel dev` from the repository root. The existing `npm run dev` command remains available for running Vite and Express separately.

## Safe initial data seeding

Seed only a newly created, otherwise empty database, before it contains any records that need to be kept. Set `MONGODB_URI` in the local shell or `Backend/.env`, then from `Backend/` run:

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
