# PlaceCell — Campus Placement Portal

Campus placement platform for students, recruiters, and the placement cell. Each feature runs as its own process so one outage does not take the site down.

**For project evaluation, read this README and [docs/architecture-report.html](docs/architecture-report.html)** (open the HTML in a browser). That report walks through architecture, every feature, data, Docker, and how to demo.

This is a new NestJS system. It is not a fork of the earlier Express/Vercel app.

## Viva cheat sheet

| Question | Answer |
|---|---|
| Isolation | One Nest **process** per feature. **Shared Mongo** — not a database per service. |
| If matching dies | Kill `:5054` (or `docker compose stop matching`). Jobs and apply still work. Resume page shows a banner. |
| CAP | Apply + interview booking are **CP** (unique indexes, idempotency, Redis lock). Job feed + inbox are **AP** (cached ranks, polling). |
| Compass | Local npm: `127.0.0.1:27017` database **nexus**. Docker: `127.0.0.1:27018` database **placecell**. Users live in `users` (`passwordHash`, not plaintext). |
| Demo | Student `student1@spp.dev` / Recruiter `recruiter@spp.dev` / Admin `admin@spp.dev` — password `Password@123`. |

## Architecture

- **Gateway** — Node (`server/src/gateway.ts` on :5050) locally, nginx on :8080 in Compose. Routes each `/v1/...` prefix to one feature process.
- **Feature services** — identity :5051, catalog :5052, applications :5053, matching :5054, interviews :5055, notifications :5056, analytics :5057
- **Worker** — same modules, BullMQ processors for LLM, email, ranking, rollups
- **Client** — React 19 + Vite + Tailwind. Loads each feature independently so one 503 does not blank the page.
- **Data** — MongoDB (source of truth) · Redis (cache, locks, queues) · MinIO/S3 (resumes)

Apply and interview booking are CP (unique indexes + locks + idempotency keys). Job feed and notifications are AP (short-TTL cache).

```
User → CDN/SPA → gateway (nginx or node)
                 ├ identity
                 ├ catalog (jobs, profile, approvals)
                 ├ applications
                 ├ matching (resume, AI)
                 ├ interviews
                 ├ notifications
                 └ analytics
                         ↘ outbox → worker → email, LLM, analytics
```

If matching dies, jobs and apply still work. If analytics dies, admin can still approve roles.

## Quick start

```bash
cd nexus   # or clone Campus_placement_portal and cd into it
cp .env.example .env                 # JWT_SECRET required by Docker Compose
cp server/.env.example server/.env   # Nest local npm
# edit JWT_SECRET and ADMIN_SIGNUP_CODE before any production deploy

npm install
npm install --prefix server
npm install --prefix client

npm run seed
npm run dev          # gateway + 7 feature services + worker + client
# npm run dev:mono   # single Nest process on :5050 (e2e / quick debug)
```

Open http://localhost:5173. Local npm uses Homebrew/host Mongo at `mongodb://127.0.0.1:27017/nexus`.

| Role | Email | Password |
|---|---|---|
| Student | student1@spp.dev | Password@123 |
| Recruiter | recruiter@spp.dev | Password@123 |
| Admin | admin@spp.dev | Password@123 |

```bash
npm test --prefix server
npm test --prefix client
npm run lint --prefix server
npm run build --prefix client
node docs/load-jobs.mjs   # job-list p95 smoke, API must be up
```

Server unit tests always run. HTTP e2e (`test/app.e2e.spec.ts`) runs on Linux CI via `mongodb-memory-server`. On macOS ARM, set `E2E_MONGODB_URI` to a running Mongo (Compose `mongo`) to execute them locally.

## Feature isolation

`npm run dev` starts one process per feature behind the gateway on :5050. Vite still proxies `/v1` there.

To prove a down feature does not take the site with it:

```bash
# after npm run dev is up
kill $(lsof -t -i:5054)   # matching / resume
# Jobs, apply, interviews still load. Resume page shows “service unavailable”.
```

### Docker

Homebrew Mongo already uses `:27017` (`nexus`). Compose does **not** steal that port.

```bash
npm run docker:up      # Mongo, Redis, MinIO, 7 services, worker, nginx+SPA
npm run docker:seed    # demo users/jobs into the Docker DB
# npm run docker:infra # Mongo/Redis/MinIO only
# npm run docker:down
```

| | Local npm | Docker Compose |
|---|---|---|
| App | http://localhost:5173 | http://localhost:8080 |
| Mongo (Compass) | `127.0.0.1:27017` database **nexus** | `127.0.0.1:27018` database **placecell** |
| Redis | `:6379` | host `:6380` |
| MinIO console | — | http://localhost:9001 (minio / minio12345) |

```bash
curl http://localhost:8080/health   # Node gateway map of each feature process
curl http://localhost:8080/ready    # 200 only if identity + catalog answer
```

Nginx serves the SPA and `/v1/...` prefixes. `/health` and `/ready` are proxied to the Node gateway so a down API is visible — they are not a static nginx 200.

## Environment

See [server/.env.example](server/.env.example) for local npm and [.env.example](.env.example) for Compose substitution. In `NODE_ENV=production` the process **throws** if `JWT_SECRET`, `ADMIN_SIGNUP_CODE`, or `MONGODB_URI` is missing or still a known default. Compose interpolates `JWT_SECRET` from the **root** `.env` — there is no baked default in `docker-compose.yml`.

- `STORAGE_BACKEND=disk` locally; `s3` against MinIO/R2/S3 in compose/prod
- `LLM_PROVIDER=ollama` locally; `regex` in Compose so resume scoring works without Ollama; `anthropic` in production
- SMTP optional — mail logs to stdout when unset

## API (selected)

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/signup\|login\|refresh\|logout` | Refresh is httpOnly cookie |
| GET/PUT | `/v1/profile` | Skills stored lowercase |
| GET/POST | `/v1/jobs` | Students see approved+active; Redis rank when warm |
| POST | `/v1/admin/jobs/:id/approve` | Emits `job.approved` |
| POST | `/v1/applications` | `Idempotency-Key`; 409 on duplicate |
| POST | `/v1/resumes` | **202** — worker analyzes |
| POST | `/v1/interviews` | Redis lock + ±30 min conflict |
| GET | `/v1/admin/analytics` | Reads snapshot |
| GET | `/health` `/ready` | Liveness / Mongo+Redis |

## Deploy

Host each feature service + worker on Fly, Railway, or Render (always-on). Put nginx (or the Node gateway) in front. Serve `client/dist` from a CDN. Do not put these APIs on serverless if you need workers or in-process sockets.

## License

MIT
