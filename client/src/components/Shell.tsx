import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell } from "./Bell";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const tabs =
    user?.role === "student"
      ? [
          ["/dashboard/student", "Jobs"],
          ["/resume-intelligence", "Resume"],
          ["/interviews", "Interviews"],
        ]
      : user?.role === "recruiter"
        ? [
            ["/dashboard/recruiter", "Hiring"],
            ["/interviews", "Interviews"],
          ]
        : [["/dashboard/admin", "Admin"]];
  const initials = (user?.name ?? "P")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 font-heading text-sm text-white">P</span>
            <span className="font-heading text-lg tracking-tight">PlaceCell</span>
          </Link>
          <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 sm:inline">
            {user?.role}
          </span>
          <nav className="ml-2 flex gap-1 text-sm">
            {tabs.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 transition ${
                    isActive ? "bg-zinc-900 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Bell />
            <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3 sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium">{user?.name}</span>
            </div>
            <button
              className="btn-ghost !px-3 !py-1.5"
              onClick={async () => {
                await logout();
                navigate("/auth");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-1 font-heading text-3xl tracking-tight text-zinc-950">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
