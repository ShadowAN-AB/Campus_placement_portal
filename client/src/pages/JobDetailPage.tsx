import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHead } from "../components/Shell";
import { useAuth } from "../context/AuthContext";
import { api, inr } from "../utils/api";

export function JobDetailPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api(`/v1/jobs/${jobId}`).then((j) => setJob(j as Record<string, unknown>));
  }, [jobId]);

  if (!job) return <p>Loading…</p>;

  return (
    <div>
      <PageHead eyebrow={String(job.company)} title={String(job.title)} subtitle={`${inr(Number(job.minSalary))} – ${inr(Number(job.maxSalary))}`} />
      <p className="mb-6 text-zinc-600">{String(job.description)}</p>
      <p className="mb-6 text-sm">Skills: {(job.requiredSkills as string[]).join(", ")}</p>
      {user?.role === "student" && (
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
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          Apply
        </button>
      )}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
    </div>
  );
}
