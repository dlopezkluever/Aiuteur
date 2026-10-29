import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authPost, call } from "./api.ts";
import { InputScreen } from "./input.tsx";
import { ProjectsPage } from "./projects.tsx";
import { RecoverPage, RedeemPage, SignInPage } from "./access.tsx";

/** Where the creator is. The client keeps the address and nothing else the product relies on (MODULE §4). */
export type Navigate = (to: string, replace?: boolean) => void;

const usePath = () => {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback<Navigate>((to, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"](null, "", to);
    setPath(new URL(to, window.location.href).pathname);
  }, []);
  return { path, navigate };
};

function Shell({ children, signedIn, navigate }: { children: ReactNode; signedIn: boolean; navigate: Navigate }) {
  return (
    <div className="shell">
      <div className="bar">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}><strong>Aiuteur</strong></a>
        {signedIn && <button type="button" onClick={async () => { await authPost("/api/auth/sign-out", {}); window.location.assign("/"); }}>Sign out</button>}
      </div>
      {children}
    </div>
  );
}

export function App() {
  const { path, navigate } = usePath();
  if (path === "/redeem") return <Shell signedIn={false} navigate={navigate}><RedeemPage navigate={navigate} /></Shell>;
  if (path === "/recover") return <Shell signedIn={false} navigate={navigate}><RecoverPage navigate={navigate} /></Shell>;
  return <Signed path={path} navigate={navigate} />;
}

/** Everything else needs a session. The session is asked of the server on every load, never remembered here. */
function Signed({ path, navigate }: { path: string; navigate: Navigate }) {
  const [session, setSession] = useState<{ accountId: string } | null | "loading">("loading");
  const refresh = useCallback(async () => {
    const answer = await call("GET /api/session");
    setSession(answer.ok ? answer.value : null);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  if (session === "loading") return <Shell signedIn={false} navigate={navigate}><p>Loading…</p></Shell>;
  if (session === null) return <Shell signedIn={false} navigate={navigate}><SignInPage onSignedIn={refresh} /></Shell>;
  const input = /^\/projects\/([^/]+)\/input$/.exec(path);
  return (
    <Shell signedIn navigate={navigate}>
      {input?.[1] ? <InputScreen accountId={session.accountId} projectId={input[1]} navigate={navigate} /> : <ProjectsPage accountId={session.accountId} navigate={navigate} />}
    </Shell>
  );
}
