import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHead } from "../components/Shell";
import { Chip, StatusBadge, ServiceNotice } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, apiTry, inr } from "../utils/api";

type Application = { _id: string; status: string; matchScore: number; jobId?: { _id?: string } };

export function JobDetailPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");
  const [catalogDown, setCatalogDown] = useState(false);
  const [applied, setApplied] = useState<Application | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({
    title: "",
    company: "",
    description: "",
    requiredSkills: "",
    minExperience: 0,
    minSalary: 0,
    maxSalary: 0,
  });

  async function reload() {
    const res = await apiTry<Record<string, unknown> | null>(`/v1/jobs/${jobId}`, null);
    setCatalogDown(res.down);
    if (!res.data) return;
    const j = res.data;
    setJob(j);
    setEdit({
      title: String(j.title ?? ""),
      company: String(j.company ?? ""),
      description: String(j.description ?? ""),
      requiredSkills: ((j.requiredSkills as string[]) ?? []).join(", "),
      minExperience: Number(j.minExperience ?? 0),
      minSalary: Number(j.minSalary ?? 0),
      maxSalary: Number(j.maxSalary ?? 0),
    });
  }

  useEffect(() => {
    reload().catch(() => undefined);
    if (user?.role === "student") {
      api<{ items: Application[] }>("/v1/applications/me?pageSize=50")
        .then((res) => setApplied(res.items.find((a) => String(a.jobId?._id) === jobId) ?? null))
        .catch(() => undefined);
    }
  }, [jobId, user?.role]);

  if (!job) {
    return catalogDown ? <ServiceNotice name="jobs" /> : <p>Loading…</p>;
  }
  const closed = job.status === "closed";

  return (
    <div>
      <PageHead
        eyebrow={String(job.company)}
        title={String(job.title)}
        subtitle={`${inr(Number(job.minSalary))} – ${inr(Number(job.maxSalary))}`}
        actions={closed ? <StatusBadge status="closed" /> : undefined}
      />
      <div className="surface mb-6 p-6">
        <p className="text-sm leading-relaxed text-zinc-600">{String(job.description)}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {((job.requiredSkills as string[]) ?? []).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </div>
      {user?.role === "student" && !applied && !closed && (
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
      {user?.role === "student" && closed && !applied && (
        <p className="text-sm text-zinc-500">This role is closed.</p>
      )}
      {user?.role === "student" && applied && (
        <p className="text-sm text-zinc-600">
          You already applied · <StatusBadge status={applied.status} />
        </p>
      )}
      {user?.role === "recruiter" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/recruiter" className="btn-ghost">Back to hiring desk</Link>
            <button className="btn-ghost" onClick={() => setEditing(!editing)}>{editing ? "Cancel edit" : "Edit role"}</button>
            {closed ? (
              <button
                className="btn-accent"
                onClick={async () => {
                  await api(`/v1/jobs/${jobId}/reopen`, { method: "POST" });
                  setMsg("Role reopened.");
                  await reload();
                }}
              >
                Reopen
              </button>
            ) : (
              <button
                className="btn-danger"
                onClick={async () => {
                  await api(`/v1/jobs/${jobId}`, { method: "DELETE" });
                  setMsg("Role closed.");
                  setEditing(false);
                  await reload();
                }}
              >
                Close role
              </button>
            )}
          </div>
          {editing && (
            <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
              <input className="input-base" placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              <input className="input-base" placeholder="Company" value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
              <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={edit.requiredSkills} onChange={(e) => setEdit({ ...edit, requiredSkills: e.target.value })} />
              <textarea className="input-base md:col-span-2" placeholder="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <input className="input-base" type="number" min={0} placeholder="Min years" value={edit.minExperience} onChange={(e) => setEdit({ ...edit, minExperience: Number(e.target.value) })} />
              <input className="input-base" type="number" min={0} placeholder="Min CTC" value={edit.minSalary} onChange={(e) => setEdit({ ...edit, minSalary: Number(e.target.value) })} />
              <input className="input-base" type="number" min={0} placeholder="Max CTC" value={edit.maxSalary} onChange={(e) => setEdit({ ...edit, maxSalary: Number(e.target.value) })} />
              <button
                className="btn-primary"
                onClick={async () => {
                  await api(`/v1/jobs/${jobId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      ...edit,
                      requiredSkills: edit.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
                      minExperience: Number(edit.minExperience),
                      minSalary: Number(edit.minSalary),
                      maxSalary: Number(edit.maxSalary),
                    }),
                  });
                  setMsg("Role updated.");
                  setEditing(false);
                  await reload();
                }}
              >
                Save changes
              </button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
    </div>
  );
}
