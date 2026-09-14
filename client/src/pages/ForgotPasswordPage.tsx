import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api("/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    setDone(true);
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 px-12 py-16 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white font-heading text-sm text-zinc-950">P</span>
          <span className="font-heading text-xl tracking-tight">PlaceCell</span>
        </div>
        <div className="relative z-10 mt-auto max-w-md pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Account recovery</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight tracking-tight">We’ll send a reset link if that campus email exists.</h1>
        </div>
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-emerald-700/30 blur-3xl" />
      </aside>
      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">PlaceCell</p>
          <h1 className="mt-2 font-heading text-3xl tracking-tight">Reset password</h1>
          <p className="mt-1 text-sm text-zinc-500">We’ll email a reset link if the account exists. The response is the same either way.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input className="input-base" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary w-full">Send reset link</button>
          </form>
          {done && <p className="mt-3 text-sm text-emerald-700">If the account exists, a reset link was sent.</p>}
          <Link className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-800" to="/auth">
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
