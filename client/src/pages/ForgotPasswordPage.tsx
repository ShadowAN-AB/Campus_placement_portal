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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">PlaceCell</p>
      <h1 className="mt-2 font-heading text-3xl tracking-tight">Reset password</h1>
      <p className="mt-1 text-sm text-zinc-500">We’ll email a reset link if the account exists. The response is the same either way.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="input-base" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      {done && <p className="mt-3 text-sm text-emerald-700">If the account exists, a reset link was sent.</p>}
      <Link className="mt-8 text-sm text-zinc-500 hover:text-zinc-800" to="/auth">
        Back to sign in
      </Link>
    </div>
  );
}
