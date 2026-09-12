import { FormEvent, useState } from "react";
import { api } from "../utils/api";

type Application = {
  _id: string;
  matchScore: number;
  studentId?: { name?: string; email?: string };
};

export function ScheduleInterviewModal({
  open,
  application,
  onClose,
  onScheduled,
}: {
  open: boolean;
  application: Application | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: tomorrow,
    time: "10:00",
    durationMinutes: "30",
    meetingType: "video",
    meetingLink: "",
    location: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !application) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (scheduledAt.getTime() <= Date.now()) {
      setError("Interview must be in the future.");
      return;
    }
    if (form.meetingType === "video" && !form.meetingLink.trim()) {
      setError("Add a meeting link for video interviews.");
      return;
    }
    if (form.meetingType === "in-person" && !form.location.trim()) {
      setError("Add a location for in-person interviews.");
      return;
    }
    setSaving(true);
    try {
      await api("/v1/interviews", {
        method: "POST",
        body: JSON.stringify({
          applicationId: application._id,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: Number(form.durationMinutes),
          meetingType: form.meetingType,
          meetingLink: form.meetingLink.trim(),
          location: form.location.trim(),
          notes: form.notes.trim(),
        }),
      });
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4" onClick={onClose}>
      <form
        className="my-8 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="font-heading text-xl">Schedule interview</h3>
        <p className="mt-1 text-sm text-zinc-500">
          {application.studentId?.name || "Candidate"} · {application.studentId?.email || ""} · {Math.round(application.matchScore || 0)}% match
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input className="input-base" type="date" min={tomorrow} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="input-base" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <select className="input-base" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
          <select className="input-base" value={form.meetingType} onChange={(e) => setForm({ ...form, meetingType: e.target.value })}>
            <option value="video">Video</option>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
          </select>
          <input className="input-base col-span-2" placeholder="Meeting link" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} />
          <input className="input-base col-span-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <textarea className="input-base col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Scheduling…" : "Schedule"}</button>
        </div>
      </form>
    </div>
  );
}
