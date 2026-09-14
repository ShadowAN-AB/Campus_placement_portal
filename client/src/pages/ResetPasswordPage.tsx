import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api("/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: params.get("token"), newPassword: password }),
    });
    setDone(true);
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">PlaceCell</p>
      <h1 className="mt-2 font-heading text-3xl tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-zinc-500">Use at least 8 characters. You’ll sign in again after this.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input className="input-base" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary w-full">Update password</button>
      </form>
      {done && (
        <Link className="mt-4 text-sm text-emerald-700" to="/auth">
          Password updated. Sign in
        </Link>
      )}
    </div>
  );
}
