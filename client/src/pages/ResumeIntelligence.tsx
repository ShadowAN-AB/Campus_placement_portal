import { FormEvent, useEffect, useState } from "react";
import { PageHead } from "../components/Shell";
import { api } from "../utils/api";

type Version = { resumeId: string; version: number; topScore: number; avgScore: number; filename: string };
type Fit = { title: string; company: string; score: number; matchedSkills: string[]; missingSkills: string[] };
type Chat = { _id: string; role: "user" | "assistant"; text: string };

export function ResumeIntelligence() {
  const [status, setStatus] = useState<string>("none");
  const [fits, setFits] = useState<Fit[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [chat, setChat] = useState<Chat[]>([]);
  const [question, setQuestion] = useState("");
  const [compare, setCompare] = useState<string>("");

  async function refresh() {
    const [st, jobs, vers, history] = await Promise.all([
      api<{ status: string }>("/v1/resumes/status"),
      api<Fit[]>("/v1/fit/jobs"),
      api<Version[]>("/v1/resumes/versions"),
      api<Chat[]>("/v1/ai/chat"),
    ]);
    setStatus(st.status);
    setFits(jobs);
    setVersions(vers);
    setChat(history);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (status === "uploaded" || status === "parsing" || status === "extracted") refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [status]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("resume") as File;
    const fd = new FormData();
    fd.append("resume", file);
    const token = sessionStorage.getItem("placecell_access");
    await fetch("/v1/resumes", { method: "POST", body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    setStatus("uploaded");
  }

  return (
    <div>
      <PageHead eyebrow="Resume intelligence" title="Score every open role" subtitle="Upload returns 202. The worker parses, extracts, and ranks." />
      <form onSubmit={upload} className="mb-6 flex gap-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <input type="file" name="resume" accept=".pdf,.docx" className="text-sm" />
        <button className="btn-primary">Upload</button>
        <span className="self-center text-sm text-zinc-500">Status: {status}</span>
      </form>
      <div className="mb-6 grid gap-3">
        {fits.slice(0, 8).map((f) => (
          <div key={`${f.company}-${f.title}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs uppercase text-emerald-600">{f.company}</p>
                <p className="font-heading text-lg">{f.title}</p>
                <p className="text-xs text-zinc-500">Matched {f.matchedSkills?.join(", ")}</p>
              </div>
              <p className="font-heading text-2xl">{f.score}</p>
            </div>
          </div>
        ))}
      </div>
      {versions.length >= 2 && (
        <button
          className="btn-ghost mb-6"
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-heading text-xl">Ask about your fit</h2>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {chat.map((c) => (
            <p key={c._id} className={c.role === "user" ? "text-zinc-900" : "text-zinc-600"}>
              <strong>{c.role}:</strong> {c.text}
            </p>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await api("/v1/ai/ask", { method: "POST", body: JSON.stringify({ question }) });
            setQuestion("");
            refresh();
          }}
        >
          <input className="input-base" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why is my Nimbus score lower?" />
          <button className="btn-primary">Ask</button>
        </form>
      </div>
    </div>
  );
}
