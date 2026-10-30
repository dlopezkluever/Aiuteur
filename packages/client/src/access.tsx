import { useState, type FormEvent } from "react";
import { authPost, call } from "./api.ts";
import type { Navigate } from "./app.tsx";

const fragmentToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";

function useForm(run: () => Promise<string | null>) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(await run());
    setBusy(false);
  };
  return { message, busy, submit };
}

export function SignInPage({ onSignedIn }: { onSignedIn(): Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const form = useForm(async () => {
    const result = await authPost("/api/auth/sign-in/email", { email, password });
    if (result.ok) { await onSignedIn(); return null; }
    return result.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password do not match.";
  });
  return (
    <section>
      <h1>Sign in</h1>
      <p className="lead">Aiuteur is invite-only. <a href="/redeem">Use an invitation</a> or <a href="/recover">recover your account</a>.</p>
      <form onSubmit={form.submit}>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" type="submit" disabled={form.busy}>Sign in</button>
        {form.message && <p className="error" role="alert">{form.message}</p>}
      </form>
    </section>
  );
}

export function RedeemPage({ navigate }: { navigate: Navigate }) {
  const [token, setToken] = useState(fragmentToken);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const form = useForm(async () => {
    const answer = await call("POST /api/invitations/redeem", {}, { body: { token, email, name, password } });
    if (answer.ok) { window.history.replaceState(null, "", "/redeem"); setDone(true); return null; }
    if (answer.code === "rate-limited") return "Too many attempts. Wait a minute and try again.";
    return answer.code === "invalid-request" ? "Check the fields: the password needs at least 12 characters." : "This invitation cannot be used. Ask for a new one.";
  });
  if (done) return (
    <section>
      <h1>Your studio is ready</h1>
      <p className="lead">Sign in with the email and password you just chose.</p>
      <a className="button primary" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Sign in</a>
    </section>
  );
  return (
    <section>
      <h1>Accept your invitation</h1>
      <form onSubmit={form.submit}>
        <label>Invitation code<input required value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Name<input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Password (12 or more characters)<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" type="submit" disabled={form.busy}>Create my studio</button>
        {form.message && <p className="error" role="alert">{form.message}</p>}
      </form>
    </section>
  );
}

export function RecoverPage({ navigate }: { navigate: Navigate }) {
  const [token] = useState(fragmentToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const request = useForm(async () => {
    const answer = await call("POST /api/recovery/request", {}, { body: { email } });
    if (answer.ok) { setSent(true); return null; }
    return answer.code === "rate-limited" ? "Too many attempts. Wait a minute and try again." : "Enter a valid email address.";
  });
  const complete = useForm(async () => {
    const answer = await call("POST /api/recovery/complete", {}, { body: { token, password } });
    if (answer.ok) { window.history.replaceState(null, "", "/recover"); setRecovered(true); return null; }
    return "This link cannot be used. Ask for a new one.";
  });
  if (recovered) return (
    <section>
      <h1>Password changed</h1>
      <p className="lead">You were signed out everywhere. Sign in with your new password.</p>
      <a className="button primary" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Sign in</a>
    </section>
  );
  if (token !== "") return (
    <section>
      <h1>Choose a new password</h1>
      <form onSubmit={complete.submit}>
        <label>New password (12 or more characters)<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" type="submit" disabled={complete.busy}>Change password</button>
        {complete.message && <p className="error" role="alert">{complete.message}</p>}
      </form>
    </section>
  );
  return (
    <section>
      <h1>Recover your account</h1>
      {sent
        ? <p className="lead" role="status">If that email has an account, a link is on its way. It works once.</p>
        : <form onSubmit={request.submit}>
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button className="primary" type="submit" disabled={request.busy}>Send recovery link</button>
            {request.message && <p className="error" role="alert">{request.message}</p>}
          </form>}
    </section>
  );
}
