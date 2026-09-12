import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScheduleInterviewModal } from "../components/ScheduleInterviewModal";
import { PageHead } from "../components/Shell";
import { Chip, Kpi, Section, StatusBadge } from "../components/ui";
import { api, inr } from "../utils/api";

type Job = {
  _id: string;
  title: string;
  company: string;
  approved: boolean;
  status: string;
  requiredSkills?: string[];
  minSalary?: number;
  maxSalary?: number;
  minExperience?: number;
  totalApplicants?: number;
};

type AppRow = {
  _id: string;
  status: string;
  matchScore: number;
  appliedAt?: string;
  studentId?: { name?: string; email?: string };
};

type Interview = {
  _id: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingType?: string;
  studentId?: { name?: string };
  jobId?: { title?: string };
};

const emptyFilters = { search: "", status: "", minMatchScore: "", skill: "", sortBy: "matchScore", order: "desc" };

export function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState("");
  const [apps, setApps] = useState<AppRow[]>([]);
  const [appTotal, setAppTotal] = useState(0);
  const [appPage, setAppPage] = useState(1);
  const [appPages, setAppPages] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [scheduleFor, setScheduleFor] = useState<AppRow | null>(null);
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    requiredSkills: "node, typescript",
    minExperience: 0,
    minSalary: 0,
    maxSalary: 0,
  });
  const [error, setError] = useState("");

  async function loadJobs() {
    const data = await api<{ items: Job[] }>("/v1/jobs?pageSize=50");
    setJobs(data.items);
    if (!selected && data.items[0]) setSelected(data.items[0]._id);
  }

  async function loadApps(jobId: string, page = 1, nextFilters = filters) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10",
      sortBy: nextFilters.sortBy,
      order: nextFilters.order,
    });
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.status) params.set("status", nextFilters.status);
    if (nextFilters.minMatchScore) params.set("minMatchScore", nextFilters.minMatchScore);
    if (nextFilters.skill) params.set("skill", nextFilters.skill);
    const data = await api<{ items: AppRow[]; total: number; totalPages: number; page: number }>(
      `/v1/applications/job/${jobId}?${params.toString()}`,
    );
    setApps(data.items);
    setAppTotal(data.total);
    setAppPages(data.totalPages ?? 1);
    setAppPage(data.page ?? page);
    setPicked([]);
  }

  useEffect(() => {
    loadJobs().catch(() => undefined);
    api<Interview[]>("/v1/interviews?upcoming=true").then(setInterviews).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (selected) loadApps(selected).catch(() => undefined);
  }, [selected]);

  const totals = useMemo(() => ({
    roles: jobs.length,
    active: jobs.filter((j) => j.status === "active" && j.approved).length,
    pending: jobs.filter((j) => !j.approved).length,
    applicants: jobs.reduce((s, j) => s + Number(j.totalApplicants || 0), 0),
  }), [jobs]);

  async function createJob(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/v1/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()),
          minExperience: Number(form.minExperience),
          minSalary: Number(form.minSalary),
          maxSalary: Number(form.maxSalary),
        }),
      });
      setForm({ title: "", company: "", description: "", requiredSkills: "node, typescript", minExperience: 0, minSalary: 0, maxSalary: 0 });
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job");
    }
  }

  async function setStatus(appId: string, status: string) {
    await api(`/v1/applications/${appId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    if (selected) loadApps(selected, appPage);
  }

  async function bulk(status: string) {
    await api("/v1/applications/bulk-status", { method: "POST", body: JSON.stringify({ appIds: picked, status }) });
    setPicked([]);
    if (selected) loadApps(selected, appPage);
  }

  const selectedJob = jobs.find((j) => j._id === selected);

  return (
    <div>
      <PageHead
        eyebrow="Recruiter"
        title="Hiring desk"
        subtitle="Post roles, filter applicants, and schedule interviews."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Roles posted" value={totals.roles} />
        <Kpi label="Active roles" value={totals.active} />
        <Kpi label="Pending approval" value={totals.pending} />
        <Kpi label="Total applicants" value={totals.applicants} />
      </div>

      <form onSubmit={createJob} className="mb-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
        <input className="input-base" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input-base" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
        <textarea className="input-base md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input className="input-base" type="number" min={0} placeholder="Min years" value={form.minExperience} onChange={(e) => setForm({ ...form, minExperience: Number(e.target.value) })} />
        <input className="input-base" type="number" min={0} placeholder="Min CTC" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: Number(e.target.value) })} />
        <input className="input-base" type="number" min={0} placeholder="Max CTC" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: Number(e.target.value) })} />
        <button className="btn-primary">Post job</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {jobs.map((j) => (
              <button key={j._id} onClick={() => setSelected(j._id)} className={selected === j._id ? "btn-primary" : "btn-ghost"}>
                {j.title} {!j.approved ? "(pending)" : ""} · {j.totalApplicants ?? 0}
              </button>
            ))}
          </div>

          {selectedJob && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl">{selectedJob.title}</h2>
                  <p className="text-sm text-zinc-500">
                    {selectedJob.company} · {inr(selectedJob.minSalary)} – {inr(selectedJob.maxSalary)} · {selectedJob.minExperience ?? 0}+ yrs
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedJob.requiredSkills ?? []).map((s) => <Chip key={s}>{s}</Chip>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={!selectedJob.approved ? "awaiting" : selectedJob.status === "closed" ? "closed" : "live"} />
                  <Link to={`/jobs/${selectedJob._id}`} className="btn-ghost">Details</Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
            <input className="input-base" placeholder="Search name or email" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <select className="input-base" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="rejected">Rejected</option>
            </select>
            <input className="input-base" type="number" min={0} max={100} placeholder="Min match %" value={filters.minMatchScore} onChange={(e) => setFilters({ ...filters, minMatchScore: e.target.value })} />
            <input className="input-base" placeholder="Skill contains" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} />
            <select className="input-base" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
              <option value="matchScore">Sort by match</option>
              <option value="appliedAt">Sort by applied date</option>
            </select>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => selected && loadApps(selected, 1, filters)}>Filter</button>
              <button className="btn-ghost" onClick={() => { setFilters(emptyFilters); if (selected) loadApps(selected, 1, emptyFilters); }}>Reset</button>
            </div>
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <span className="self-center text-sm">{picked.length} selected</span>
              <button className="btn-accent" onClick={() => bulk("shortlisted")}>Shortlist</button>
              <button className="btn-ghost" onClick={() => bulk("interview")}>Move to interview</button>
              <button className="btn-danger" onClick={() => bulk("rejected")}>Reject</button>
            </div>
          )}

          <table className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-sm">
            <thead className="bg-stone-50 text-left text-zinc-500">
              <tr>
                <th className="p-3">
                  <input type="checkbox" onChange={(e) => setPicked(e.target.checked ? apps.map((a) => a._id) : [])} />
                </th>
                <th className="p-3">Candidate</th>
                <th className="p-3">Email</th>
                <th className="p-3">Score</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a._id} className="border-t border-zinc-100">
                  <td className="p-3">
                    <input type="checkbox" checked={picked.includes(a._id)} onChange={(e) => setPicked(e.target.checked ? [...picked, a._id] : picked.filter((id) => id !== a._id))} />
                  </td>
                  <td className="p-3 font-medium">{a.studentId?.name ?? "—"}</td>
                  <td className="p-3 text-zinc-600">{a.studentId?.email ?? "—"}</td>
                  <td className="p-3 tabular-nums">{Math.round(a.matchScore || 0)}%</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button className="btn-accent" onClick={() => setStatus(a._id, "shortlisted")}>Shortlist</button>
                      <button className="btn-ghost" onClick={() => setScheduleFor(a)}>Schedule</button>
                      <button className="btn-danger" onClick={() => setStatus(a._id, "rejected")}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!apps.length && (
                <tr>
                  <td className="p-4 text-zinc-500" colSpan={6}>No applicants for this role{selectedJob && !selectedJob.approved ? " yet — it is still awaiting approval." : "."}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <p>{appTotal} result(s) · Page {appPage} of {appPages}</p>
            <div className="flex gap-2">
              <button className="btn-ghost" disabled={appPage <= 1} onClick={() => selected && loadApps(selected, appPage - 1)}>Previous</button>
              <button className="btn-ghost" disabled={appPage >= appPages} onClick={() => selected && loadApps(selected, appPage + 1)}>Next</button>
            </div>
          </div>
        </div>

        <Section title="Upcoming interviews" subtitle={`${interviews.length} scheduled`} action={<button className="text-xs text-zinc-500" onClick={() => navigate("/interviews")}>Open board</button>}>
          {interviews.length ? (
            <ul className="space-y-3">
              {interviews.slice(0, 4).map((iv) => (
                <li key={iv._id} className="rounded-xl border border-zinc-200 p-3">
                  <p className="text-sm font-medium">{iv.studentId?.name || "Candidate"}</p>
                  <p className="text-xs text-zinc-500">{iv.jobId?.title || "Role"}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {new Date(iv.scheduledAt).toLocaleString("en-IN")} · {iv.durationMinutes} min
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Nothing on the calendar yet.</p>
          )}
        </Section>
      </div>

      <ScheduleInterviewModal
        open={!!scheduleFor}
        application={scheduleFor}
        onClose={() => setScheduleFor(null)}
        onScheduled={() => {
          if (selected) loadApps(selected, appPage);
          api<Interview[]>("/v1/interviews?upcoming=true").then(setInterviews);
        }}
      />
    </div>
  );
}
