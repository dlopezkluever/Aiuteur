import { useEffect, useState } from "react";
import type { Project } from "@aiuteur/contract";
import { call } from "./api.ts";
import type { Navigate } from "./app.tsx";

export function ProjectsPage({ accountId, navigate }: { accountId: string; navigate: Navigate }) {
  const [projects, setProjects] = useState<readonly Project[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void call("GET /api/studios/:accountId/projects", { accountId }).then((answer) => answer.ok ? setProjects(answer.value.projects) : setFailed(true));
  }, [accountId]);
  const create = async () => {
    const answer = await call("POST /api/studios/:accountId/projects", { accountId });
    if (answer.ok) navigate(`/projects/${answer.value.projectId}/input`);
    else setFailed(true);
  };
  return (
    <section>
      <h1>Projects</h1>
      {failed && <p className="error" role="alert">Something went wrong. Reload and try again.</p>}
      <p className="lead">{projects !== null && projects.length === 0 ? "You have no projects yet." : "Pick up where you left off, or start a new one."}</p>
      <button className="primary" type="button" onClick={create}>New project</button>
      {projects !== null && projects.length > 0 && (
        <ul className="plain" style={{ marginTop: "1.5rem" }}>
          {projects.map((project) => (
            <li className="card" key={project.projectId}>
              <a href={`/projects/${project.projectId}/input`} onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.projectId}/input`); }}>Project started {new Date(project.createdAt).toLocaleString()}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
