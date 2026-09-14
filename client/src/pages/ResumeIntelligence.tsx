import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHead } from "../components/Shell";
import { Chip, FactorBar, Section, ServiceNotice, scoreTone } from "../components/ui";
import { api, apiTry } from "../utils/api";

type Factors = { skills?: number; experience?: number; salary?: number; education?: number; projects?: number };
type Fit = {
  title: string;
  company: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  factors?: Factors;
};
type FitRes = { items?: Fit[]; extractedData?: Extracted | null; source?: string };
type Extracted = { skills?: string[]; education?: { degree?: string; school?: string }[]; projects?: { name?: string }[]; certifications?: string[] };
type Version = { resumeId: string; version: number; topScore: number; avgScore: number; filename: string; uploadedAt?: string };
type Chat = { _id: string; role: "user" | "assistant"; text: string };
type ResumeStatus = { status: string; filename?: string; version?: number; error?: string };
type Health = { healthy?: boolean; provider?: string; error?: string };

const STATUS_LABEL: Record<string, string> = {
  none: "No resume uploaded",
  uploaded: "Queued for analysis",
  parsing: "Parsing file…",
  extracted: "Scoring roles…",
  analyzed: "Analyzed",
  failed: "Analysis failed",
};

export function ResumeIntelligence() {
  const [status, setStatus] = useState<ResumeStatus>({ status: "none" });
  const [source, setSource] = useState<string>("profile");
  const [jobs, setJobs] = useState<Fit[]>([]);
  const [companies, setCompanies] = useState<Fit[]>([]);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [chat, setChat] = useState<Chat[]>([]);
  const [question, setQuestion] = useState("");
  const [compare, setCompare] = useState("");
  const [asking, setAsking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [matchingDown, setMatchingDown] = useState(false);

  const busy = ["uploaded", "parsing", "extracted"].includes(status.status);

  async function refresh() {
    const [st, jobRes, companyRes, vers, history, ai] = await Promise.all([
      apiTry<ResumeStatus>("/v1/resumes/status", { status: "none" }),
      apiTry<Fit[] | FitRes>("/v1/fit/jobs", { items: [] }),
      apiTry<Fit[] | FitRes>("/v1/fit/companies", { items: [] }),
      apiTry<Version[]>("/v1/resumes/versions", []),
      apiTry<Chat[]>("/v1/ai/chat", []),
      apiTry<Health>("/v1/ai/health", { healthy: false }),
    ]);
    setMatchingDown(st.down);
    const jobPayload = Array.isArray(jobRes.data) ? { items: jobRes.data } : jobRes.data;
    const companyPayload = Array.isArray(companyRes.data) ? { items: companyRes.data } : companyRes.data;
    setStatus(st.data);
    setJobs(jobPayload.items ?? []);
    setCompanies(companyPayload.items ?? []);
    setExtracted(jobPayload.extractedData ?? companyPayload.extractedData ?? null);
    setSource(jobPayload.source ?? companyPayload.source ?? "profile");
    setVersions(vers.data);
    setChat(history.data);
    setHealth(ai.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => {
      refresh().catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [busy]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const input = e.currentTarget.elements.namedItem("resume") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a PDF or DOCX resume first.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10 MB or smaller.");
      return;
    }
    const fd = new FormData();
    fd.append("resume", file);
    const token = sessionStorage.getItem("placecell_access");
    setUploading(true);
    try {
      const res = await fetch("/v1/resumes", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Upload failed");
      }
      setFileName(file.name);
      setStatus({ status: "uploaded", filename: file.name });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const readiness = useMemo(() => {
    if (!jobs.length) return 0;
    return Math.round(jobs.reduce((s, j) => s + (j.score || 0), 0) / jobs.length);
  }, [jobs]);

  return (
    <div>
      <PageHead
        eyebrow="Resume intelligence"
        title="Score every open role"
        subtitle={source === "resume" ? "Scores from your latest analyzed resume." : "Live profile match until a resume is analyzed."}
      />
      {matchingDown && <ServiceNotice name="resume intelligence" />}
      <form onSubmit={upload} className="surface mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-heading text-lg tracking-tight">Upload a resume</p>
            <p className="mt-0.5 text-sm text-zinc-500">PDF or Word, up to 10 MB. Analysis runs in the background.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${health?.healthy ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
            AI {health?.healthy ? "ready" : "regex fallback"}
          </span>
        </div>
        <label className="relative mt-5 block cursor-pointer overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 text-center transition hover:border-emerald-600 hover:bg-emerald-50/40">
          <input
            type="file"
            name="resume"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <div className="pointer-events-none px-6 py-10">
            <p className="truncate text-sm font-medium text-zinc-800">{fileName || status.filename || "Drop a PDF or DOCX here, or click to browse"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {STATUS_LABEL[status.status] ?? status.status}
              {status.version ? ` · version ${status.version}` : ""}
            </p>
          </div>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={uploading || busy || matchingDown}>
            {uploading ? "Uploading…" : busy ? "Analyzing…" : "Analyse resume"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status.status === "failed" && status.error && <p className="text-sm text-red-600">{status.error}</p>}
        </div>
        {versions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {versions.map((v) => (
              <span key={v.resumeId} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                v{v.version} {v.filename} · top {Math.round(v.topScore)}%
              </span>
            ))}
          </div>
        )}
      </form>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="surface p-5">
          <p className="label-caps">Avg. readiness</p>
          <p className={`mt-2 font-heading text-4xl tabular-nums tracking-tight ${scoreTone(readiness)}`}>{readiness}</p>
        </div>
        <div className="surface p-5">
          <p className="label-caps">Companies scored</p>
          <p className="mt-2 font-heading text-4xl tracking-tight">{companies.length}</p>
        </div>
        <div className="surface p-5">
          <p className="label-caps">Roles scored</p>
          <p className="mt-2 font-heading text-4xl tracking-tight">{jobs.length}</p>
        </div>
      </div>

      {extracted && (extracted.skills?.length || extracted.education?.length) ? (
        <Section title="Extracted from resume" subtitle="Merged into your student profile">
          <div className="flex flex-wrap gap-1.5">
            {(extracted.skills ?? []).map((s) => <Chip key={s} tone="accent">{s}</Chip>)}
          </div>
          {(extracted.education ?? []).length > 0 && (
            <p className="mt-3 text-sm text-zinc-600">
              {(extracted.education ?? []).map((e) => [e.degree, e.school].filter(Boolean).join(" · ")).join(" · ")}
            </p>
          )}
        </Section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Company fit" subtitle="Best role at each company">
          <div className="space-y-4">
            {companies.map((c) => (
              <div key={c.company} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-600">{c.company}</p>
                    <p className="font-heading text-lg">{c.title}</p>
                  </div>
                  <p className={`font-heading text-2xl ${scoreTone(c.score)}`}>{Math.round(c.score)}%</p>
                </div>
                {c.factors && (
                  <div className="mt-3 space-y-1.5">
                    <FactorBar label="Skills" value={c.factors.skills ?? 0} />
                    <FactorBar label="Experience" value={c.factors.experience ?? 0} />
                    <FactorBar label="Salary" value={c.factors.salary ?? 0} />
                    <FactorBar label="Education" value={c.factors.education ?? 0} />
                    <FactorBar label="Projects" value={c.factors.projects ?? 0} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(c.matchedSkills ?? []).slice(0, 6).map((s) => <Chip key={`m-${s}`} tone="accent">{s}</Chip>)}
                  {(c.missingSkills ?? []).slice(0, 4).map((s) => <Chip key={`x-${s}`} tone="warn">{s}</Chip>)}
                </div>
              </div>
            ))}
            {!companies.length && <p className="text-sm text-zinc-500">No company scores yet. Save a profile or upload a resume.</p>}
          </div>
        </Section>

        <Section title="Job fit" subtitle="Every open role, ranked">
          <div className="space-y-3">
            {jobs.map((f) => (
              <div key={`${f.company}-${f.title}`} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">{f.company}</p>
                    <p className="font-heading text-lg">{f.title}</p>
                    <p className="text-xs text-zinc-500">Matched {(f.matchedSkills ?? []).join(", ") || "—"}</p>
                  </div>
                  <p className={`font-heading text-2xl ${scoreTone(f.score)}`}>{Math.round(f.score)}%</p>
                </div>
                {f.factors && (
                  <div className="mt-3 space-y-1.5">
                    <FactorBar label="Skills" value={f.factors.skills ?? 0} />
                    <FactorBar label="Experience" value={f.factors.experience ?? 0} />
                    <FactorBar label="Salary" value={f.factors.salary ?? 0} />
                  </div>
                )}
              </div>
            ))}
            {!jobs.length && <p className="text-sm text-zinc-500">No role scores yet.</p>}
          </div>
        </Section>
      </div>

      {versions.length >= 2 && (
        <button
          className="btn-ghost mb-6 mt-6"
          onClick={async () => {
            const [a, b] = versions;
            const data = await api<{ diff: { skillsAdded: string[]; skillsRemoved: string[] } }>(
              `/v1/resumes/compare?a=${a.resumeId}&b=${b.resumeId}`,
            );
            setCompare(`Added: ${data.diff.skillsAdded.join(", ") || "—"} · Removed: ${data.diff.skillsRemoved.join(", ") || "—"}`);
          }}
        >
          Compare last two versions
        </button>
      )}
      {compare && <p className="mb-6 text-sm text-zinc-600">{compare}</p>}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl">Ask about your fit</h2>
          {chat.length > 0 && (
            <button
              className="btn-ghost"
              onClick={async () => {
                await api("/v1/ai/chat", { method: "DELETE" });
                setChat([]);
              }}
            >
              Clear chat
            </button>
          )}
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {chat.map((c) => (
            <p key={c._id} className={c.role === "user" ? "text-zinc-900" : "text-zinc-600"}>
              <strong>{c.role}:</strong> {c.text}
            </p>
          ))}
          {!chat.length && <p className="text-sm text-zinc-500">Ask why a company scored lower, or which skill to add next.</p>}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!question.trim() || asking) return;
            setAsking(true);
            try {
              await api("/v1/ai/ask", { method: "POST", body: JSON.stringify({ question }) });
              setQuestion("");
              await refresh();
            } finally {
              setAsking(false);
            }
          }}
        >
          <input className="input-base" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why is my Nimbus score lower?" />
          <button className="btn-primary" disabled={asking}>{asking ? "…" : "Ask"}</button>
        </form>
      </div>
    </div>
  );
}
