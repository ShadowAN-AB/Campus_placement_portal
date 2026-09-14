import { useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { ServiceNotice } from "../components/ui";
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
      <h2 className="mb-3 font-heading text-xl">Pending approvals</h2>
      <div className="space-y-2">
        {pending.map((j) => (
          <div key={j._id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4">
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
      {data && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-heading text-xl">12-month applications</h2>
          <div className="flex h-32 items-end gap-1">
            {data.trend.map((t) => (
              <div key={t.month} className="flex-1 bg-emerald-600/80" style={{ height: `${Math.max(8, t.applications * 12)}%` }} title={`${t.month}: ${t.applications}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="font-heading text-2xl">{value}</p>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
