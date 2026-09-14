import { useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { Kpi, ServiceNotice } from "../components/ui";
import { api, apiTry, inr } from "../utils/api";

type Analytics = {
  totals: { students: number; recruiters: number; jobs: number; applications: number };
  placementRate: number;
  avgPackage: number;
  topCompanies: { company: string; count: number }[];
  trend: { month: string; applications: number }[];
};

type Job = { _id: string; title: string; company: string };

export function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [pending, setPending] = useState<Job[]>([]);
  const [analyticsDown, setAnalyticsDown] = useState(false);
  const [catalogDown, setCatalogDown] = useState(false);

  async function load() {
    const [a, p] = await Promise.all([
      apiTry<Analytics | null>("/v1/admin/analytics", null),
      apiTry<{ items: Job[] }>("/v1/admin/approvals", { items: [] }),
    ]);
    setAnalyticsDown(a.down);
    setCatalogDown(p.down);
    setData(a.data);
    setPending(p.data.items);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHead eyebrow="Admin" title="Placement cell" subtitle="Analytics are snapshot reads, not live scans." />
      {analyticsDown && <ServiceNotice name="analytics" />}
      {catalogDown && <ServiceNotice name="jobs" />}
      {data && (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Students" value={data.totals.students} />
          <Kpi label="Applications" value={data.totals.applications} />
          <Kpi label="Placement rate" value={`${data.placementRate}%`} />
          <Kpi label="Avg package" value={inr(data.avgPackage)} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-xl tracking-tight">Pending approvals</h2>
          <div className="space-y-2">
            {pending.map((j) => (
              <div key={j._id} className="surface flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{j.title}</p>
                  <p className="text-sm text-zinc-500">{j.company}</p>
                </div>
                <button
                  className="btn-accent"
                  onClick={async () => {
                    await api(`/v1/admin/jobs/${j._id}/approve`, { method: "POST" });
                    load();
                  }}
                >
                  Approve
                </button>
              </div>
            ))}
            {!pending.length && <p className="text-sm text-zinc-500">Nothing waiting.</p>}
          </div>
        </div>
        {data && (
          <div className="surface p-5">
            <h2 className="font-heading text-lg tracking-tight">Top companies</h2>
            <p className="mt-0.5 text-sm text-zinc-500">By applications this snapshot</p>
            <ul className="mt-4 space-y-3">
              {(data.topCompanies ?? []).slice(0, 6).map((c) => (
                <li key={c.company} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.company}</span>
                  <span className="tabular-nums text-zinc-500">{c.count}</span>
                </li>
              ))}
              {!(data.topCompanies ?? []).length && <li className="text-sm text-zinc-500">No company volume yet.</li>}
            </ul>
          </div>
        )}
      </div>
      {data && (
        <div className="surface mt-8 p-5">
          <h2 className="mb-4 font-heading text-xl tracking-tight">12-month applications</h2>
          <div className="flex h-36 items-end gap-1.5">
            {data.trend.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-emerald-700/85"
                  style={{ height: `${Math.max(8, t.applications * 12)}%` }}
                  title={`${t.month}: ${t.applications}`}
                />
                <span className="hidden text-[10px] text-zinc-400 sm:block">{t.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
