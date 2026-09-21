import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScheduleInterviewModal } from "../components/ScheduleInterviewModal";
import { PageHead } from "../components/Shell";
import { Chip, Kpi, Section, ServiceNotice, StatusBadge } from "../components/ui";
import { api, apiTry, inr } from "../utils/api";

type Job = {
  _id: string;
  title: string;
  company: string;
  description?: string;
  approved: boolean;
  status: string;
  requiredSkills?: string[];
  minSalary?: number;
  maxSalary?: number;
  minExperience?: number;
  totalApplicants?: number;
  season?: string;
  departments?: string[];
  minCgpa?: number;
  graduationYear?: number;
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
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({
    title: "",
    company: "",
    description: "",
    requiredSkills: "",
    minExperience: 0,
    minSalary: 0,
    maxSalary: 0,
    season: "",
    departments: "",
    minCgpa: 0,
    graduationYear: 0,
  });
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    requiredSkills: "node, typescript",
    minExperience: 0,
    minSalary: 0,
    maxSalary: 0,
    season: "2026-27",
    departments: "cse, it",
    minCgpa: 7,
    graduationYear: 2027,
  });
  const [error, setError] = useState("");
  const [jobsDown, setJobsDown] = useState(false);
  const [appsDown, setAppsDown] = useState(false);

  async function loadJobs() {
    const data = await apiTry<{ items: Job[] }>("/v1/jobs?pageSize=50", { items: [] });
    setJobsDown(data.down);
    setJobs(data.data.items);
    if (!selected && data.data.items[0]) setSelected(data.data.items[0]._id);
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
    const data = await apiTry<{ items: AppRow[]; total: number; totalPages: number; page: number }>(
      `/v1/applications/job/${jobId}?${params.toString()}`,
      { items: [], total: 0, totalPages: 1, page },
    );
    setAppsDown(data.down);
    setApps(data.data.items);
    setAppTotal(data.data.total);
    setAppPages(data.data.totalPages ?? 1);
    setAppPage(data.data.page ?? page);
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
          departments: form.departments.split(",").map((s) => s.trim()).filter(Boolean),
          minExperience: Number(form.minExperience),
          minSalary: Number(form.minSalary),
          maxSalary: Number(form.maxSalary),
          minCgpa: Number(form.minCgpa),
          graduationYear: Number(form.graduationYear) || 0,
        }),
      });
      setForm({
        title: "",
        company: "",
        description: "",
        requiredSkills: "node, typescript",
        minExperience: 0,
        minSalary: 0,
        maxSalary: 0,
        season: "2026-27",
        departments: "cse, it",
        minCgpa: 7,
        graduationYear: 2027,
      });
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

  function startEdit(job: Job) {
    setEdit({
      title: job.title,
      company: job.company,
      description: job.description ?? "",
      requiredSkills: (job.requiredSkills ?? []).join(", "),
      minExperience: job.minExperience ?? 0,
      minSalary: job.minSalary ?? 0,
      maxSalary: job.maxSalary ?? 0,
      season: job.season ?? "",
      departments: (job.departments ?? []).join(", "),
      minCgpa: job.minCgpa ?? 0,
      graduationYear: job.graduationYear ?? 0,
    });
    setEditing(true);
  }

  async function saveJob() {
    if (!selected) return;
    setError("");
    try {
      await api(`/v1/jobs/${selected}`, {
        method: "PUT",
        body: JSON.stringify({
          ...edit,
          requiredSkills: edit.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
          departments: edit.departments.split(",").map((s) => s.trim()).filter(Boolean),
          minExperience: Number(edit.minExperience),
          minSalary: Number(edit.minSalary),
          maxSalary: Number(edit.maxSalary),
          minCgpa: Number(edit.minCgpa),
          graduationYear: Number(edit.graduationYear) || 0,
        }),
      });
      setEditing(false);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function closeJob() {
    if (!selected) return;
    setError("");
    try {
      await api(`/v1/jobs/${selected}`, { method: "DELETE" });
      setEditing(false);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close role");
    }
  }

  async function reopenJob() {
    if (!selected) return;
    setError("");
    try {
      await api(`/v1/jobs/${selected}/reopen`, { method: "POST" });
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen role");
    }
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
      {jobsDown && <ServiceNotice name="jobs" />}
      {appsDown && <ServiceNotice name="applications" />}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Roles posted" value={totals.roles} />
        <Kpi label="Active roles" value={totals.active} />
        <Kpi label="Pending approval" value={totals.pending} />
        <Kpi label="Total applicants" value={totals.applicants} />
      </div>

      <form onSubmit={createJob} className="surface mb-8 grid gap-3 p-5 md:grid-cols-2">
        <input className="input-base" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input-base" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
        <textarea className="input-base md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input className="input-base" type="number" min={0} placeholder="Min years" value={form.minExperience} onChange={(e) => setForm({ ...form, minExperience: Number(e.target.value) })} />
        <input className="input-base" type="number" min={0} placeholder="Min CTC" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: Number(e.target.value) })} />
        <input className="input-base" type="number" min={0} placeholder="Max CTC" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: Number(e.target.value) })} />
        <input className="input-base" placeholder="Season (e.g. 2026-27)" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
        <input className="input-base" placeholder="Departments (comma)" value={form.departments} onChange={(e) => setForm({ ...form, departments: e.target.value })} />
        <input className="input-base" type="number" min={0} max={10} step={0.1} placeholder="Min CGPA" value={form.minCgpa} onChange={(e) => setForm({ ...form, minCgpa: Number(e.target.value) })} />
        <input className="input-base" type="number" placeholder="Grad year" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: Number(e.target.value) })} />
        <button className="btn-primary">Post job</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {jobs.map((j) => (
              <button
                key={j._id}
                onClick={() => {
                  setSelected(j._id);
                  setEditing(false);
                }}
                className={selected === j._id ? "btn-primary" : "btn-ghost"}
              >
                {j.title} {!j.approved ? "(pending)" : j.status === "closed" ? "(closed)" : ""} · {j.totalApplicants ?? 0}
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
                    {selectedJob.season ? ` · ${selectedJob.season}` : ""}
                    {(selectedJob.departments ?? []).length ? ` · ${(selectedJob.departments ?? []).join("/")}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedJob.requiredSkills ?? []).map((s) => <Chip key={s}>{s}</Chip>)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={!selectedJob.approved ? "awaiting" : selectedJob.status === "closed" ? "closed" : "live"} />
                  <Link to={`/jobs/${selectedJob._id}`} className="btn-ghost">Details</Link>
                  <button className="btn-ghost" onClick={() => (editing ? setEditing(false) : startEdit(selectedJob))}>
                    {editing ? "Cancel edit" : "Edit"}
                  </button>
                  {selectedJob.status === "closed" ? (
                    <button className="btn-accent" onClick={reopenJob}>Reopen</button>
                  ) : (
                    <button className="btn-danger" onClick={closeJob}>Close role</button>
                  )}
                </div>
              </div>
              {editing && (
                <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 md:grid-cols-2">
                  <input className="input-base" placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                  <input className="input-base" placeholder="Company" value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
                  <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={edit.requiredSkills} onChange={(e) => setEdit({ ...edit, requiredSkills: e.target.value })} />
                  <textarea className="input-base md:col-span-2" placeholder="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                  <input className="input-base" type="number" min={0} placeholder="Min years" value={edit.minExperience} onChange={(e) => setEdit({ ...edit, minExperience: Number(e.target.value) })} />
                  <input className="input-base" type="number" min={0} placeholder="Min CTC" value={edit.minSalary} onChange={(e) => setEdit({ ...edit, minSalary: Number(e.target.value) })} />
                  <input className="input-base" type="number" min={0} placeholder="Max CTC" value={edit.maxSalary} onChange={(e) => setEdit({ ...edit, maxSalary: Number(e.target.value) })} />
                  <input className="input-base" placeholder="Season" value={edit.season} onChange={(e) => setEdit({ ...edit, season: e.target.value })} />
                  <input className="input-base" placeholder="Departments (comma)" value={edit.departments} onChange={(e) => setEdit({ ...edit, departments: e.target.value })} />
                  <input className="input-base" type="number" min={0} max={10} step={0.1} placeholder="Min CGPA" value={edit.minCgpa} onChange={(e) => setEdit({ ...edit, minCgpa: Number(e.target.value) })} />
                  <input className="input-base" type="number" placeholder="Grad year" value={edit.graduationYear} onChange={(e) => setEdit({ ...edit, graduationYear: Number(e.target.value) })} />
                  <button className="btn-primary" onClick={saveJob}>Save changes</button>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
            <input className="input-base" placeholder="Search name or email" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <select className="input-base" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
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
              <button className="btn-primary" onClick={() => bulk("offered")}>Send offer</button>
              <button className="btn-danger" onClick={() => bulk("rejected")}>Reject</button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
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
                      <td className="p-3 tabular-nums font-medium text-emerald-700">{Math.round(a.matchScore || 0)}%</td>
                      <td className="p-3"><StatusBadge status={a.status} /></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button className="btn-accent !px-3 !py-1.5" onClick={() => setStatus(a._id, "shortlisted")}>Shortlist</button>
                          <button className="btn-primary !px-3 !py-1.5" onClick={() => setStatus(a._id, "offered")}>Offer</button>
                          <button className="btn-ghost !px-3 !py-1.5" onClick={() => setScheduleFor(a)}>Schedule</button>
                          <button className="btn-danger !px-3 !py-1.5" onClick={() => setStatus(a._id, "rejected")}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!apps.length && (
                    <tr>
                      <td className="p-5 text-zinc-500" colSpan={6}>
                        {appsDown
                          ? "Applications service is unavailable."
                          : `No applicants for this role${selectedJob && !selectedJob.approved ? " yet — it is still awaiting approval." : "."}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
