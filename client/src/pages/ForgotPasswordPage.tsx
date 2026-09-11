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
      <h1 className="font-heading text-3xl">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="input-base" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary">Send link</button>
      </form>
      {done && <p className="mt-3 text-sm text-emerald-700">If the account exists, a reset link was sent.</p>}
      <Link className="mt-6 text-sm text-zinc-500" to="/auth">
        Back to sign in
      </Link>
    </div>
  );
}
