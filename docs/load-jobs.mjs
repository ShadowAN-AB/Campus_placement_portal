/**
 * Smoke the job-list path. Start the API first.
 *   node docs/load-jobs.mjs
 */
const base = process.env.API_URL ?? "http://localhost:5050";

async function main() {
  const login = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student1@spp.dev", password: "Password@123" }),
  });
  const { accessToken } = await login.json();
  const n = Number(process.env.N ?? 50);
  const started = Date.now();
  const times = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const res = await fetch(`${base}/v1/jobs`, { headers: { Authorization: `Bearer ${accessToken}` } });
    times.push(Date.now() - t0);
    if (!res.ok) throw new Error(`list failed ${res.status}`);
  }
  times.sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95) - 1];
  console.log(
    JSON.stringify(
      {
        requests: n,
        avgMs: Math.round(times.reduce((s, x) => s + x, 0) / times.length),
        p95Ms: p95,
        maxMs: times[times.length - 1],
        elapsedMs: Date.now() - started,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
