import type { ReactNode } from "react";

export function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="font-heading text-2xl">{value}</p>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
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
    <section className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="font-heading text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
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
  rejected: "bg-red-50 text-red-700",
  interview: "bg-indigo-50 text-indigo-700",
  scheduled: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-500",
  live: "bg-emerald-50 text-emerald-800",
  closed: "bg-zinc-100 text-zinc-600",
  awaiting: "bg-amber-50 text-amber-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_TONES[status] ?? STATUS_TONES.pending}`}>
      {status}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "accent" }) {
  const tones = {
    neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return <span className={`inline-flex rounded border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
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
