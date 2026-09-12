import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHead } from "../components/Shell";
import { Chip, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, inr } from "../utils/api";

type Application = { _id: string; status: string; matchScore: number; jobId?: { _id?: string } };

export function JobDetailPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");
  const [applied, setApplied] = useState<Application | null>(null);

  useEffect(() => {
    api(`/v1/jobs/${jobId}`).then((j) => setJob(j as Record<string, unknown>));
    if (user?.role === "student") {
      api<{ items: Application[] }>("/v1/applications/me?pageSize=50")
        .then((res) => setApplied(res.items.find((a) => String(a.jobId?._id) === jobId) ?? null))
        .catch(() => undefined);
    }
  }, [jobId, user?.role]);

  if (!job) return <p>Loading…</p>;

  return (
    <div>
      <PageHead eyebrow={String(job.company)} title={String(job.title)} subtitle={`${inr(Number(job.minSalary))} – ${inr(Number(job.maxSalary))}`} />
      <p className="mb-6 text-zinc-600">{String(job.description)}</p>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {((job.requiredSkills as string[]) ?? []).map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
      {user?.role === "student" && !applied && (
        <button
          className="btn-accent"
          onClick={async () => {
            try {
              await api("/v1/applications", {
                method: "POST",
                headers: { "Idempotency-Key": `job-${jobId}` },
                body: JSON.stringify({ jobId }),
              });
              setMsg("Applied.");
              setApplied({ _id: "new", status: "pending", matchScore: 0 });
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          Apply
        </button>
      )}
      {user?.role === "student" && applied && (
        <p className="text-sm text-zinc-600">
          You already applied · <StatusBadge status={applied.status} />
        </p>
      )}
      {user?.role === "recruiter" && (
        <Link to="/dashboard/recruiter" className="btn-ghost">Back to hiring desk</Link>
      )}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
    </div>
  );
}
