# PlaceCell — Campus Placement Portal

Campus placement platform for students, recruiters, and the placement cell. Async resume scoring, idempotent apply, interview locks, and snapshot analytics.

This is a new system. It is not a fork of the earlier Express/Vercel app.

## Architecture

- **API** — NestJS modular monolith (`identity`, `catalog`, `applications`, `matching`, `interviews`, `notifications`, `analytics`)
- **Worker** — same modules, BullMQ processors for LLM, email, ranking, rollups
- **Client** — React 19 + Vite + Tailwind
- **Data** — MongoDB (source of truth) · Redis (cache, locks, queues) · MinIO/S3 (resumes)

Apply and interview booking are CP (unique indexes + locks + idempotency keys). Job feed and notifications are AP (short-TTL cache).

```
User → CDN/SPA → API replicas → Redis / Mongo / S3
                         ↘ outbox → worker → email, LLM, analytics
```

Two API replicas sit behind nginx in Compose (`api` + `api-b`) to prove the process is stateless.

## Quick start

```bash
cd placecell
cp server/.env.example server/.env
# edit JWT_SECRET and ADMIN_SIGNUP_CODE before any production deploy

docker compose up -d mongo redis minio
npm install
npm install --prefix server
npm install --prefix client

npm run seed
npm run dev:worker   # terminal 2 — required for resume analyze + mail
npm run dev          # API :5050 + client :5173
```

Open http://localhost:5173

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

## Two-replica proof

```bash
export JWT_SECRET=change-me-to-a-long-random-string-prod
export ADMIN_SIGNUP_CODE=change-me-too-prod
docker compose up --build api api-b worker proxy mongo redis minio
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

Nginx (`docs/nginx.conf`) balances `/v1` across `api` and `api-b`.

## Environment

See [server/.env.example](server/.env.example). In `NODE_ENV=production` the process **throws** if `JWT_SECRET`, `ADMIN_SIGNUP_CODE`, or `MONGODB_URI` is missing or still a known default.

- `STORAGE_BACKEND=disk` locally; `s3` against MinIO/R2/S3 in compose/prod
- `LLM_PROVIDER=ollama` locally; `anthropic` in production
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

Host API + worker on Fly, Railway, or Render (always-on). Serve `client/dist` from a CDN. Do not put the API on serverless if you need workers or multi-replica sockets.

## License

MIT
