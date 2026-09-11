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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-zinc-900 font-heading text-sm text-white">
              P
            </span>
            <span className="font-heading text-lg">PlaceCell.</span>
          </Link>
          <span className="text-xs uppercase tracking-wide text-emerald-600">{user?.role}</span>
          <nav className="ml-6 flex gap-3 text-sm">
            {tabs.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? "font-medium text-emerald-700" : "text-zinc-600 hover:text-zinc-900"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Bell />
            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm">{user?.name}</span>
            <button
              className="btn-ghost"
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
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">{eyebrow}</p>
        <h1 className="font-heading text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
