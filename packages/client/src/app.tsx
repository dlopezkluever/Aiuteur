import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authPost, call } from "./api.ts";
import { InputScreen } from "./input.tsx";
import { ProjectsPage } from "./projects.tsx";
import { RecoverPage, RedeemPage, SignInPage } from "./access.tsx";
import { ShotsScreen } from "./shots.tsx";
import { WorldScreen } from "./world.tsx";

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
  const step = /^\/projects\/([^/]+)\/(input|world|shots)$/.exec(path);
  const projectId = step?.[1];
  const screen = step?.[2];
  return (
    <Shell signedIn navigate={navigate}>
      {projectId && screen ? (
        <>
          <ProjectNav projectId={projectId} current={screen} navigate={navigate} />
          {screen === "input" && <InputScreen accountId={session.accountId} projectId={projectId} navigate={navigate} />}
          {screen === "world" && <WorldScreen accountId={session.accountId} projectId={projectId} navigate={navigate} />}
          {screen === "shots" && <ShotsScreen accountId={session.accountId} projectId={projectId} navigate={navigate} />}
        </>
      ) : <ProjectsPage accountId={session.accountId} navigate={navigate} />}
    </Shell>
  );
}

/** The steps of a project T0 has screens for. The address is the only state it reads. */
function ProjectNav({ projectId, current, navigate }: { projectId: string; current: string; navigate: Navigate }) {
  const steps = [["input", "Input"], ["world", "World"], ["shots", "Shots"]] as const;
  return (
    <nav className="project" aria-label="Project">
      {steps.map(([key, label]) => (
        <a key={key} href={`/projects/${projectId}/${key}`} aria-current={current === key ? "page" : undefined}
          onClick={(e) => { e.preventDefault(); navigate(`/projects/${projectId}/${key}`); }}>{label}</a>
      ))}
    </nav>
  );
}
