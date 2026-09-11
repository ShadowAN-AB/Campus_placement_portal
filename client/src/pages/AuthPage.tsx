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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">PlaceCell</p>
      <h1 className="font-heading text-3xl">Campus placement, production-shaped.</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "signup" && (
          <input className="input-base" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        )}
        <input className="input-base" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-base" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mode === "signup" && (
          <>
            <select className="input-base" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
            {form.role === "admin" && (
              <input className="input-base" placeholder="Admin signup code" value={form.adminCode} onChange={(e) => setForm({ ...form, adminCode: e.target.value })} />
            )}
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">{mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-zinc-500">
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}
