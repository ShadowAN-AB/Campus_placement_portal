import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHead } from "../components/Shell";
import { api, inr } from "../utils/api";

type Job = {
  _id: string;
  title: string;
  company: string;
  requiredSkills: string[];
  minSalary: number;
  maxSalary: number;
  matchScore?: number;
};

export function StudentDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<number>(0);
  const [profile, setProfile] = useState({ skills: "", bio: "", expectedSalary: 0, yearsOfExperience: 0 });

  async function load() {
    const [jobRes, appRes, me] = await Promise.all([
      api<{ items: Job[] }>("/v1/jobs"),
      api<{ total: number }>("/v1/applications/me"),
      api<{ skills: string[]; bio: string; expectedSalary: number; yearsOfExperience: number }>("/v1/profile"),
    ]);
    setJobs(jobRes.items);
    setApps(appRes.total);
    setProfile({
      skills: (me.skills ?? []).join(", "),
      bio: me.bio ?? "",
      expectedSalary: me.expectedSalary ?? 0,
      yearsOfExperience: me.yearsOfExperience ?? 0,
    });
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div>
      <PageHead eyebrow="Student" title="Open roles" subtitle="Ranked when a match cache is warm." />
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Kpi label="Visible jobs" value={jobs.length} />
        <Kpi label="Applications" value={apps} />
        <Kpi label="Skills" value={profile.skills.split(",").filter(Boolean).length} />
      </div>
      <form
        className="mb-8 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/v1/profile", {
            method: "PUT",
            body: JSON.stringify({
              skills: profile.skills.split(",").map((s) => s.trim()),
              bio: profile.bio,
              expectedSalary: Number(profile.expectedSalary),
              yearsOfExperience: Number(profile.yearsOfExperience),
            }),
          });
          load();
        }}
      >
        <input className="input-base md:col-span-2" placeholder="Skills (comma)" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
        <input className="input-base" type="number" placeholder="Expected CTC" value={profile.expectedSalary} onChange={(e) => setProfile({ ...profile, expectedSalary: Number(e.target.value) })} />
        <input className="input-base" type="number" placeholder="Years exp" value={profile.yearsOfExperience} onChange={(e) => setProfile({ ...profile, yearsOfExperience: Number(e.target.value) })} />
        <textarea className="input-base md:col-span-3" placeholder="Bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        <button className="btn-primary">Save profile</button>
      </form>
      <div className="grid gap-3">
        {jobs.map((job) => (
          <Link key={job._id} to={`/jobs/${job._id}`} className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">{job.company}</p>
                <h2 className="font-heading text-xl">{job.title}</h2>
                <p className="mt-1 text-sm text-zinc-500">{job.requiredSkills.join(" · ")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-500">{inr(job.minSalary)} – {inr(job.maxSalary)}</p>
                {job.matchScore != null && <p className="font-heading text-2xl text-emerald-700">{Math.round(job.matchScore)}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-2xl font-heading">{value}</p>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
