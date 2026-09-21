import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHead } from "../components/Shell";
import { Chip, Kpi, Section, StatusBadge, ServiceNotice, countdown } from "../components/ui";
import { api, apiTry, inr } from "../utils/api";

type Job = {
  _id: string;
  title: string;
  company: string;
  requiredSkills: string[];
  minSalary: number;
  maxSalary: number;
  matchScore?: number;
  season?: string;
  departments?: string[];
  minCgpa?: number;
  graduationYear?: number;
  eligible?: boolean;
  eligibilityReasons?: string[];
};

type Application = {
  _id: string;
  status: string;
  matchScore: number;
  appliedAt: string;
  jobId?: { _id?: string; title?: string; company?: string };
};

type Profile = {
  skills: string[];
  bio: string;
  expectedSalary: number;
  yearsOfExperience: number;
  department?: string;
  cgpa?: number;
  graduationYear?: number;
};

type Interview = {
  _id: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingType?: string;
  meetingLink?: string;
  jobId?: { title?: string; company?: string };
};

export function StudentDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [appTotal, setAppTotal] = useState(0);
  const [appPage, setAppPage] = useState(1);
  const [appPages, setAppPages] = useState(1);
  const [profile, setProfile] = useState({
    skills: "",
    bio: "",
    expectedSalary: 0,
    yearsOfExperience: 0,
    department: "",
    cgpa: 0,
    graduationYear: 0,
  });
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [error, setError] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [down, setDown] = useState({ catalog: false, applications: false, interviews: false });

  async function load(page = appPage) {
    const [jobRes, appRes, allApps, me, ivs] = await Promise.all([
      apiTry<{ items: Job[] }>("/v1/jobs", { items: [] }),
      apiTry<{ items: Application[]; total: number; totalPages: number; page: number }>(`/v1/applications/me?page=${page}&pageSize=10`, {
        items: [],
        total: 0,
        totalPages: 1,
        page,
      }),
      apiTry<{ items: Application[] }>("/v1/applications/me?page=1&pageSize=50", { items: [] }),
      apiTry<Profile>("/v1/profile", { skills: [], bio: "", expectedSalary: 0, yearsOfExperience: 0, department: "", cgpa: 0, graduationYear: 0 }),
      apiTry<Interview[]>("/v1/interviews?upcoming=true", []),
    ]);
    setDown({
      catalog: jobRes.down || me.down,
      applications: appRes.down || allApps.down,
      interviews: ivs.down,
    });
    setJobs(jobRes.data.items);
    setApps(appRes.data.items);
    setAppTotal(appRes.data.total);
    setAppPages(appRes.data.totalPages ?? 1);
    setAppPage(appRes.data.page ?? page);
    setProfile({
      skills: (me.data.skills ?? []).join(", "),
      bio: me.data.bio ?? "",
      expectedSalary: me.data.expectedSalary ?? 0,
      yearsOfExperience: me.data.yearsOfExperience ?? 0,
      department: me.data.department ?? "",
      cgpa: me.data.cgpa ?? 0,
      graduationYear: me.data.graduationYear ?? 0,
    });
    setInterviews(ivs.data);
    setAppliedIds(new Set(allApps.data.items.map((a) => String(a.jobId?._id ?? "")).filter(Boolean)));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const insights = useMemo(() => {
    const demand = new Map<string, number>();
    jobs.forEach((job) => (job.requiredSkills ?? []).forEach((s) => demand.set(s.toLowerCase(), (demand.get(s.toLowerCase()) ?? 0) + 1)));
    const topSkills = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);
    const have = new Set(profile.skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    return { topSkills, missing: topSkills.filter((s) => !have.has(s)).slice(0, 6) };
  }, [jobs, profile.skills]);

  const stats = useMemo(() => {
    const shortlisted = apps.filter((a) => a.status === "shortlisted" || a.status === "interview").length;
    const avg = apps.length ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / apps.length) : 0;
    return { shortlisted, avg };
  }, [apps]);

  async function applyForJob(jobId: string) {
    setError("");
    try {
      await api("/v1/applications", {
        method: "POST",
        headers: { "Idempotency-Key": `job-${jobId}` },
        body: JSON.stringify({ jobId }),
      });
      await load(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    }
  }

  async function seedProfile() {
    setError("");
    try {
      await api("/v1/profile", {
        method: "PUT",
        body: JSON.stringify({
          skills: ["javascript", "typescript", "react", "node"],
          yearsOfExperience: 1,
          expectedSalary: 1200000,
          bio: "CS student focused on full-stack systems.",
          department: "cse",
          cgpa: 8.2,
          graduationYear: 2027,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
    }
  }

  return (
    <div>
      <PageHead
        eyebrow="Student"
        title="Your placements"
        subtitle="Recommended roles, live application status, and upcoming interviews."
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={seedProfile}>Auto-fill profile</button>
            <button className="btn-accent" onClick={() => navigate("/resume-intelligence")}>Analyse resume</button>
          </div>
        }
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {down.catalog && <ServiceNotice name="jobs / profile" />}
      {down.applications && <ServiceNotice name="applications" />}
      {down.interviews && <ServiceNotice name="interviews" />}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Applications" value={appTotal} />
        <Kpi label="Shortlisted / Interview" value={stats.shortlisted} />
        <Kpi label="Avg. match" value={`${stats.avg}%`} />
        <Kpi label="Open roles" value={jobs.length} />
      </div>

      <form
        className="surface mb-8 grid gap-3 p-5 md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/v1/profile", {
            method: "PUT",
            body: JSON.stringify({
              skills: profile.skills.split(",").map((s) => s.trim()),
              bio: profile.bio,
              expectedSalary: Number(profile.expectedSalary),
              yearsOfExperience: Number(profile.yearsOfExperience),
              department: profile.department,
              cgpa: Number(profile.cgpa),
              graduationYear: Number(profile.graduationYear) || undefined,
            }),
          });
          load();
        }}
      >
        <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
        <input className="input-base" placeholder="Department (e.g. cse)" value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
        <input className="input-base" type="number" min={0} max={10} step={0.1} placeholder="CGPA" value={profile.cgpa} onChange={(e) => setProfile({ ...profile, cgpa: Number(e.target.value) })} />
        <input className="input-base" type="number" placeholder="Grad year" value={profile.graduationYear} onChange={(e) => setProfile({ ...profile, graduationYear: Number(e.target.value) })} />
        <input className="input-base" type="number" placeholder="Expected CTC" value={profile.expectedSalary} onChange={(e) => setProfile({ ...profile, expectedSalary: Number(e.target.value) })} />
        <input className="input-base" type="number" placeholder="Years exp" value={profile.yearsOfExperience} onChange={(e) => setProfile({ ...profile, yearsOfExperience: Number(e.target.value) })} />
        <textarea className="input-base md:col-span-3" placeholder="Bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        <button className="btn-primary">Save profile</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Recommended roles" subtitle="Ranked when a match cache is warm.">
            <div className="grid gap-3">
              {jobs.map((job) => (
                <div key={job._id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-emerald-600">{job.company}</p>
                    <h2 className="font-heading text-xl">{job.title}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{inr(job.minSalary)} – {inr(job.maxSalary)}</p>
                    {(job.season || job.departments?.length || job.minCgpa) && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {[job.season, (job.departments ?? []).join("/"), job.minCgpa ? `CGPA ${job.minCgpa}+` : "", job.graduationYear ? `grad ${job.graduationYear}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {job.eligible === false && (
                      <p className="mt-1 text-xs text-amber-800">{(job.eligibilityReasons ?? []).join(" · ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(job.requiredSkills ?? []).slice(0, 6).map((s) => <Chip key={s}>{s}</Chip>)}
                    </div>
                  </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      {job.matchScore != null && (
                        <p className="font-heading text-2xl tabular-nums text-emerald-700">{Math.round(job.matchScore)}%</p>
                      )}
                    <div className="flex gap-2">
                      <Link to={`/jobs/${job._id}`} className="btn-ghost">View</Link>
                      {appliedIds.has(job._id) ? (
                        <span className="btn-ghost pointer-events-none opacity-60">Applied</span>
                      ) : job.eligible === false ? (
                        <span className="btn-ghost pointer-events-none opacity-60">Not eligible</span>
                      ) : (
                        <button className="btn-primary" onClick={() => applyForJob(job._id)}>Apply</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!jobs.length && (
                <p className="text-sm text-zinc-500">{down.catalog ? "Jobs service is down." : "No open roles yet."}</p>
              )}
            </div>
          </Section>

          <Section title="My applications" subtitle="Live status from recruiters">
            {apps.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="pb-2">Role</th>
                        <th className="pb-2">Company</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Match</th>
                        <th className="pb-2 text-right">Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((a) => (
                        <tr key={a._id} className="border-t border-zinc-100">
                          <td className="py-3 font-medium">{a.jobId?.title ?? "—"}</td>
                          <td className="py-3 text-zinc-600">{a.jobId?.company ?? "—"}</td>
                          <td className="py-3"><StatusBadge status={a.status} /></td>
                          <td className="py-3 text-right tabular-nums">{Math.round(a.matchScore || 0)}%</td>
                          <td className="py-3 text-right text-zinc-500">{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString("en-IN") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <p>Page {appPage} of {appPages}</p>
                  <div className="flex gap-2">
                    <button className="btn-ghost" disabled={appPage <= 1} onClick={() => load(Math.max(1, appPage - 1))}>Previous</button>
                    <button className="btn-ghost" disabled={appPage >= appPages} onClick={() => load(Math.min(appPages, appPage + 1))}>Next</button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                {down.applications ? "Applications service is down." : "No applications yet. Apply to a role above to get started."}
              </p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Career insights" subtitle="What top jobs are asking for">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">In demand</p>
            <div className="flex flex-wrap gap-1.5">
              {insights.topSkills.length ? insights.topSkills.map((s) => <Chip key={s}>{s}</Chip>) : <span className="text-xs text-zinc-400">No data yet.</span>}
            </div>
            <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-zinc-500">To add</p>
            <div className="flex flex-wrap gap-1.5">
              {insights.missing.length ? insights.missing.map((s) => <Chip key={s} tone="warn">{s}</Chip>) : <span className="text-xs text-zinc-400">You're aligned with current jobs.</span>}
            </div>
          </Section>

          <Section title="Upcoming interviews" subtitle="Scheduled by recruiters" action={<Link to="/interviews" className="text-xs text-zinc-500 hover:text-zinc-800">View all</Link>}>
            {interviews.length ? (
              <ul className="space-y-3">
                {interviews.slice(0, 3).map((iv) => (
                  <li key={iv._id} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{iv.jobId?.title || "Position"}</p>
                        <p className="text-xs text-zinc-500">{iv.jobId?.company || "Company"}</p>
                      </div>
                      <Chip tone="accent">{countdown(iv.scheduledAt)}</Chip>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      {new Date(iv.scheduledAt).toLocaleString("en-IN")} · {iv.durationMinutes} min · {iv.meetingType || "online"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {iv.meetingLink && (
                        <a className="btn-primary" href={iv.meetingLink} target="_blank" rel="noreferrer">Join</a>
                      )}
                      <button
                        className="btn-ghost"
                        onClick={async () => {
                          const { url } = await api<{ url: string }>(`/v1/interviews/${iv._id}/calendar-link`);
                          window.location.href = url;
                        }}
                      >
                        Add to calendar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">{down.interviews ? "Interviews service is down." : "Nothing on the calendar yet."}</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
