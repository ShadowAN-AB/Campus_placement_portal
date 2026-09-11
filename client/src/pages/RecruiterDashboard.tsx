import { FormEvent, useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { api } from "../utils/api";

type Job = { _id: string; title: string; company: string; approved: boolean; status: string };
type AppRow = { _id: string; status: string; matchScore: number; studentId: { name?: string; email?: string } };

export function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState("");
  const [apps, setApps] = useState<AppRow[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", company: "", description: "", requiredSkills: "node, typescript" });

  async function loadJobs() {
    const data = await api<{ items: Job[] }>("/v1/jobs");
    setJobs(data.items);
    if (!selected && data.items[0]) setSelected(data.items[0]._id);
  }

  async function loadApps(jobId: string) {
    const data = await api<{ items: AppRow[] }>(`/v1/applications/job/${jobId}`);
    setApps(data.items);
  }

  useEffect(() => {
    loadJobs();
  }, []);
  useEffect(() => {
    if (selected) loadApps(selected);
  }, [selected]);

  async function createJob(e: FormEvent) {
    e.preventDefault();
    await api("/v1/jobs", {
      method: "POST",
      body: JSON.stringify({ ...form, requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()) }),
    });
    setForm({ title: "", company: "", description: "", requiredSkills: "node, typescript" });
    loadJobs();
  }

  return (
    <div>
      <PageHead eyebrow="Recruiter" title="Hiring desk" subtitle="Jobs start unapproved. Bulk actions enqueue notifications." />
      <form onSubmit={createJob} className="mb-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
        <input className="input-base" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input-base" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className="input-base md:col-span-2" placeholder="Skills" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
        <textarea className="input-base md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn-primary">Post job</button>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {jobs.map((j) => (
          <button key={j._id} onClick={() => setSelected(j._id)} className={selected === j._id ? "btn-primary" : "btn-ghost"}>
            {j.title} {j.approved ? "" : "(pending)"}
          </button>
        ))}
      </div>
      {picked.length > 0 && (
        <div className="mb-3 flex gap-2 rounded-xl border border-zinc-200 bg-white p-3">
          <button className="btn-accent" onClick={() => bulk("shortlisted")}>Shortlist</button>
          <button className="btn-danger" onClick={() => bulk("rejected")}>Reject</button>
          <button className="btn-ghost" onClick={() => bulk("interview")}>Move to interview</button>
        </div>
      )}
      <table className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-sm">
        <thead className="bg-stone-50 text-left text-zinc-500">
          <tr>
            <th className="p-3"><input type="checkbox" onChange={(e) => setPicked(e.target.checked ? apps.map((a) => a._id) : [])} /></th>
            <th className="p-3">Candidate</th>
            <th className="p-3">Score</th>
            <th className="p-3">Status</th>
            <th className="p-3">Book</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a._id} className="border-t border-zinc-100">
              <td className="p-3">
                <input type="checkbox" checked={picked.includes(a._id)} onChange={(e) => setPicked(e.target.checked ? [...picked, a._id] : picked.filter((id) => id !== a._id))} />
              </td>
              <td className="p-3">{a.studentId?.name ?? a.studentId?.email}</td>
              <td className="p-3">{a.matchScore}</td>
              <td className="p-3">{a.status}</td>
              <td className="p-3">
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    const scheduledAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
                    await api("/v1/interviews", { method: "POST", body: JSON.stringify({ applicationId: a._id, scheduledAt, durationMinutes: 30 }) });
                    alert("Interview scheduled");
                  }}
                >
                  Schedule
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  async function bulk(status: string) {
    await api("/v1/applications/bulk-status", { method: "POST", body: JSON.stringify({ appIds: picked, status }) });
    setPicked([]);
    if (selected) loadApps(selected);
  }
}
