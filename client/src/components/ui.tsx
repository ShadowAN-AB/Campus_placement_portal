import type { ReactNode } from "react";

export function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-5">
      <p className="label-caps">{label}</p>
      <p className="mt-2 font-heading text-3xl tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="font-heading text-lg tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_TONES: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  shortlisted: "bg-emerald-50 text-emerald-800",
  offered: "bg-amber-50 text-amber-900",
  accepted: "bg-emerald-50 text-emerald-800",
  declined: "bg-zinc-100 text-zinc-600",
  rejected: "bg-red-50 text-red-700",
  interview: "bg-indigo-50 text-indigo-800",
  scheduled: "bg-indigo-50 text-indigo-800",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-500",
  live: "bg-emerald-50 text-emerald-800",
  closed: "bg-zinc-100 text-zinc-600",
  awaiting: "bg-amber-50 text-amber-900",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_TONES[status] ?? STATUS_TONES.pending}`}>
      {status}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "accent" }) {
  const tones = {
    neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function scoreTone(value: number) {
  if (value >= 80) return "text-emerald-700";
  if (value >= 55) return "text-zinc-900";
  if (value >= 35) return "text-amber-700";
  return "text-red-700";
}

export function FactorBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(2, Math.min(100, Number(value) || 0));
  const bar =
    width >= 80 ? "bg-emerald-600" : width >= 55 ? "bg-zinc-900" : width >= 35 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
      <span className={`w-9 text-right text-xs tabular-nums ${scoreTone(width)}`}>{Math.round(width)}%</span>
    </div>
  );
}

export function countdown(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export function ServiceNotice({ name }: { name: string }) {
  return (
    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
      The {name} service is unavailable. The rest of PlaceCell still works.
    </p>
  );
}
