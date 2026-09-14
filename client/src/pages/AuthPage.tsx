import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", adminCode: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user =
        mode === "login"
          ? await login(form.email, form.password)
          : await signup(form);
      navigate(user.role === "admin" ? "/dashboard/admin" : user.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 px-12 py-16 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white font-heading text-sm text-zinc-950">P</span>
          <span className="font-heading text-xl tracking-tight">PlaceCell</span>
        </div>
        <div className="relative z-10 mt-auto max-w-md pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Campus placement</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight tracking-tight">
            Roles, applications, and interviews — without the spreadsheet chaos.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Students apply once. Recruiters shortlist with filters. The placement cell approves what the campus sees.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-emerald-700/30 blur-3xl" />
      </aside>
      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 lg:hidden">PlaceCell</p>
          <h2 className="font-heading text-3xl tracking-tight">{mode === "login" ? "Sign in" : "Create an account"}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "login" ? "Use your campus email to continue." : "Students, recruiters, and the placement cell each get their own workspace."}
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            {mode === "signup" && (
              <input className="input-base" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            )}
            <input className="input-base" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input-base" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {mode === "signup" && (
              <>
                <select className="input-base" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Placement cell (admin)</option>
                </select>
                {form.role === "admin" && (
                  <input className="input-base" placeholder="Admin signup code" value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} />
                )}
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full">{mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <div className="mt-5 flex justify-between text-sm text-zinc-500">
            <button type="button" className="hover:text-zinc-800" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Need an account?" : "Have an account?"}
            </button>
            <Link className="hover:text-zinc-800" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
