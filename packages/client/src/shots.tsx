import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterRead, ShotRead } from "@aiuteur/contract";
import { call, command } from "./api.ts";
import type { Navigate } from "./app.tsx";

const newAction = () => crypto.randomUUID();
const asPresence = (entities: Iterable<string>) => [...entities].map((entity) => ({ entity, look: "base" as const }));

/** Who is present: one box per Character. The selection is unsaved view state until the server answers. */
function PresencePicker({ characters, chosen, onChange, disabled }: { characters: readonly CharacterRead[]; chosen: ReadonlySet<string>; onChange(next: Set<string>): void; disabled: boolean }) {
  return (
    <fieldset className="presence">
      <legend>Present in this shot</legend>
      {characters.length === 0 ? <span>Add a character in World first.</span> : characters.map((c) => (
        <label key={c.objectId}>
          <input type="checkbox" disabled={disabled} checked={chosen.has(c.objectId)} onChange={(e) => {
            const next = new Set(chosen);
            if (e.target.checked) next.add(c.objectId); else next.delete(c.objectId);
            onChange(next);
          }} />{c.name}
        </label>
      ))}
    </fieldset>
  );
}

function ShotCard({ shot, characters, disabled, onSave }: { shot: ShotRead; characters: readonly CharacterRead[]; disabled: boolean; onSave(shot: ShotRead, chosen: Set<string>): Promise<void> }) {
  // The draft restarts from the server's Presence whenever a new Revision is read.
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(shot.presence.map((p) => p.entity)));
  useEffect(() => setChosen(new Set(shot.presence.map((p) => p.entity))), [shot.objectId, shot.sequence]);
  return (
    <li className="card" data-object-id={shot.objectId} data-testid="shot">
      <p className="source-text" data-testid="shot-action">{shot.action || "No action yet."}</p>
      <div className="meta">
        <span>Present: <span data-testid="presence">{shot.presence.length === 0 ? "nobody" : shot.presence.map((p) => p.name).join(", ")}</span></span>
        <span>Revision <span data-testid="sequence">{shot.sequence}</span></span>
      </div>
      <PresencePicker characters={characters} chosen={chosen} onChange={setChosen} disabled={disabled} />
      <button type="button" disabled={disabled} onClick={() => void onSave(shot, chosen)}>Save presence</button>
      {shot.sideLine.map((entry) => (
        <p className="aside" key={entry.attemptId} data-testid="kept-aside">Kept aside: present {entry.presence.length === 0 ? "nobody" : entry.presence.map((p) => p.name).join(", ")}, based on revision {entry.basedOn}</p>
      ))}
    </li>
  );
}

/** The T0 hand-made Shot: an action and who is present. A stale write is refused by the server and re-rendered from it. */
export function ShotsScreen({ accountId, projectId, navigate }: { accountId: string; projectId: string; navigate: Navigate }) {
  const [shots, setShots] = useState<readonly ShotRead[] | null>(null);
  const [characters, setCharacters] = useState<readonly CharacterRead[]>([]);
  const [action, setAction] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const createAction = useRef(newAction());
  const params = { accountId, projectId };

  const load = useCallback(async () => {
    const [shotList, characterList] = await Promise.all([
      call("GET /api/studios/:accountId/projects/:projectId/shots", { accountId, projectId }),
      call("GET /api/studios/:accountId/projects/:projectId/characters", { accountId, projectId }),
    ]);
    if (shotList.ok && characterList.ok) { setShots(shotList.value.shots); setCharacters(characterList.value.characters); return; }
    const status = shotList.ok ? (characterList.ok ? 0 : characterList.status) : shotList.status;
    if (status === 401) window.location.assign("/");
    else if (status === 404) navigate("/", true);
    else setProblem("Could not load this project. Reload and try again.");
  }, [accountId, projectId, navigate]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setPending(true); setNotice(null); setProblem(null);
    const answer = await command("POST /api/studios/:accountId/projects/:projectId/shots", params, { action, presence: asPresence(chosen) }, createAction.current);
    if (answer.ok && answer.value.result === "Applied") { setAction(""); setChosen(new Set()); createAction.current = newAction(); }
    else setProblem("That shot was not added. Try again.");
    await load();
    setPending(false);
  };
  const save = async (shot: ShotRead, next: Set<string>) => {
    setPending(true); setNotice(null); setProblem(null);
    const answer = await command("POST /api/studios/:accountId/projects/:projectId/shots/:objectId/presence", { ...params, objectId: shot.objectId }, { base: shot.sequence, presence: asPresence(next) }, newAction());
    if (!answer.ok) setProblem("That did not save. Try again.");
    else if (answer.value.result === "StaleBase") setNotice("This shot changed somewhere else, so your change was kept aside. You are now seeing the latest version.");
    else if (answer.value.result !== "Applied") setProblem("That change was not accepted.");
    await load();
    setPending(false);
  };

  return (
    <section>
      <h1>Shots</h1>
      <p className="lead">Make a shot by hand and say who is in it.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {problem && <p className="error" role="alert">{problem}</p>}
      <form className="wide" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label>What happens<textarea name="action" value={action} onChange={(e) => setAction(e.target.value)} /></label>
        <PresencePicker characters={characters} chosen={chosen} onChange={setChosen} disabled={pending} />
        <button className="primary" type="submit" disabled={pending || (action.trim() === "" && chosen.size === 0)}>{pending ? "Saving…" : "Add shot"}</button>
      </form>
      <section aria-label="Shots">
        <h2>Your shots</h2>
        {shots === null ? <p>Loading…</p> : shots.length === 0 ? <p>No shots yet.</p> : (
          <ul className="plain">
            {shots.map((shot) => <ShotCard key={shot.objectId} shot={shot} characters={characters} disabled={pending} onSave={save} />)}
          </ul>
        )}
      </section>
    </section>
  );
}
