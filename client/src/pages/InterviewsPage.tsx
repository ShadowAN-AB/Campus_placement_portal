import { useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

type Interview = {
  _id: string;
  scheduledAt: string;
  status: string;
  durationMinutes: number;
  notes?: string;
};

export function InterviewsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Interview[]>([]);

  async function load() {
    setItems(await api<Interview[]>("/v1/interviews"));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHead eyebrow="Interviews" title="Calendar" subtitle="Times stored in UTC. Calendar files use a short-lived signed link." />
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <p className="font-medium">{new Date(i.scheduledAt).toLocaleString()}</p>
              <p className="text-sm text-zinc-500">
                {i.status} · {i.durationMinutes} min
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                onClick={async () => {
                  const { url } = await api<{ url: string }>(`/v1/interviews/${i._id}/calendar-link`);
                  window.location.href = url;
                }}
              >
                .ics
              </button>
              {user?.role === "recruiter" && i.status === "scheduled" && (
                <>
                  <button
                    className="btn-ghost"
                    onClick={async () => {
                      const scheduledAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
                      await api(`/v1/interviews/${i._id}/reschedule`, { method: "PUT", body: JSON.stringify({ scheduledAt }) });
                      load();
                    }}
                  >
                    Reschedule
                  </button>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      await api(`/v1/interviews/${i._id}/cancel`, { method: "PUT", body: JSON.stringify({ reason: "Cancelled from portal" }) });
                      load();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-accent"
                    onClick={async () => {
                      await api(`/v1/interviews/${i._id}/complete`, { method: "PUT", body: JSON.stringify({ rating: 5, feedback: "Strong" }) });
                      load();
                    }}
                  >
                    Complete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-zinc-500">No interviews yet.</p>}
      </div>
    </div>
  );
}
