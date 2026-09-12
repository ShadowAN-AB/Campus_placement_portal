import { useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { StatusBadge, countdown } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

type Interview = {
  _id: string;
  scheduledAt: string;
  status: string;
  durationMinutes: number;
  notes?: string;
  meetingType?: string;
  meetingLink?: string;
  location?: string;
  jobId?: { title?: string; company?: string };
  studentId?: { name?: string; email?: string };
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
      <PageHead eyebrow="Interviews" title="Calendar" subtitle="Join links, calendar files, and recruiter actions." />
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <p className="font-medium">{i.jobId?.title || "Interview"}</p>
              <p className="text-sm text-zinc-500">
                {i.jobId?.company || ""}
                {user?.role === "recruiter" && i.studentId?.name ? ` · ${i.studentId.name}` : ""}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {new Date(i.scheduledAt).toLocaleString("en-IN")} · {i.durationMinutes} min · {i.meetingType || "online"}
                {i.status === "scheduled" ? ` · ${countdown(i.scheduledAt)}` : ""}
              </p>
              {i.location && <p className="text-xs text-zinc-500">{i.location}</p>}
              <div className="mt-2"><StatusBadge status={i.status} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {i.meetingLink && i.status === "scheduled" && (
                <a className="btn-primary" href={i.meetingLink} target="_blank" rel="noreferrer">Join</a>
              )}
              <button
                className="btn-ghost"
                onClick={async () => {
                  const { url } = await api<{ url: string }>(`/v1/interviews/${i._id}/calendar-link`);
                  window.location.href = url;
                }}
              >
                Add to calendar
              </button>
              {user?.role === "recruiter" && i.status === "scheduled" && (
                <>
                  <button
                    className="btn-ghost"
                    onClick={async () => {
                      const next = window.prompt("Reschedule to (YYYY-MM-DDTHH:MM)", new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 16));
                      if (!next) return;
                      await api(`/v1/interviews/${i._id}/reschedule`, { method: "PUT", body: JSON.stringify({ scheduledAt: new Date(next).toISOString() }) });
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
