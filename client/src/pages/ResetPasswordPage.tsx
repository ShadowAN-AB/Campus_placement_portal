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
      <h1 className="font-heading text-3xl">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="input-base" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary">Update password</button>
      </form>
      {done && (
        <Link className="mt-4 text-sm text-emerald-700" to="/auth">
          Password updated. Sign in
        </Link>
      )}
    </div>
  );
}
