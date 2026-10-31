import { useCallback, useEffect, useRef, useState } from "react";
import { ROLES, readVocabulary, type InputRead } from "@aiuteur/contract";
import { call, write } from "./api.ts";
import type { Navigate } from "./app.tsx";

type Item = InputRead["items"][number];
const newAction = () => crypto.randomUUID();
const label = (raw: unknown) => { const reading = readVocabulary(ROLES, raw); return reading.known ? reading.value : reading.label; };

/**
 * The Input phase. Everything shown is the last read model the server answered; a write is shown as pending until
 * a read model at or after it confirms it, and a refusal re-renders from the server's current state (MODULE §4 rules 3, 4).
 */
export function InputScreen({ accountId, projectId, navigate }: { accountId: string; projectId: string; navigate: Navigate }) {
  const [items, setItems] = useState<readonly Item[] | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // One action id per intended paste: a retry of the same intent is the same action (STORY-DOCUMENTS §4).
  const pasteAction = useRef(newAction());
  const params = { accountId, projectId };

  const load = useCallback(async () => {
    const answer = await call("GET /api/studios/:accountId/projects/:projectId/source-material", { accountId, projectId });
    if (answer.ok) { setItems(answer.value.items); return true; }
    if (answer.status === 401) { window.location.assign("/"); return false; }
    if (answer.status === 404) { navigate("/", true); return false; }
    setProblem("Could not load this project. Reload and try again.");
    return false;
  }, [accountId, projectId, navigate]);
  useEffect(() => { void load(); }, [load]);

  const settle = async (outcome: Awaited<ReturnType<typeof write>>, onApplied: () => void) => {
    if (!outcome.ok) setProblem("That did not save. Try again.");
    else if (outcome.value.result === "Applied") { setProblem(null); onApplied(); }
    else if (outcome.value.result === "StaleBase") setNotice("This changed somewhere else, so your change was kept aside. You are now seeing the latest version.");
    else setProblem("That change was not accepted.");
    await load();
    setPending(null);
  };

  const paste = async () => {
    setPending("paste"); setNotice(null);
    await settle(await write("POST /api/studios/:accountId/projects/:projectId/source-material", params, { text }, pasteAction.current), () => { setText(""); pasteAction.current = newAction(); });
  };
  const changeRole = async (item: Item, role: (typeof ROLES)[number]) => {
    setPending(item.head.objectId); setNotice(null);
    await settle(await write("POST /api/studios/:accountId/projects/:projectId/source-material/:objectId/role", { ...params, objectId: item.head.objectId }, { base: item.head.sequence, role }, newAction()), () => undefined);
  };

  return (
    <section>
      <h1>Input</h1>
      <p className="lead">Add whatever you have. Two sentences is a complete start.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {problem && <p className="error" role="alert">{problem}</p>}
      <form className="wide" onSubmit={(e) => { e.preventDefault(); void paste(); }}>
        <label>Paste or type<textarea name="material" value={text} onChange={(e) => setText(e.target.value)} /></label>
        <button className="primary" type="submit" disabled={text.trim() === "" || pending !== null}>{pending === "paste" ? "Saving…" : "Add to project"}</button>
      </form>
      <section aria-label="Your material">
        <h2>Your material</h2>
        {items === null ? <p>Loading…</p> : items.length === 0 ? <p>Nothing added yet.</p> : (
          <ul className="plain">
            {items.map((item) => (
              <li className="card" key={item.head.objectId} data-object-id={item.head.objectId}>
                <p className="source-text" data-testid="source-text">{item.head.text}</p>
                <div className="meta">
                  <span>Role: <span data-testid="role">{label(item.head.role)}</span></span>
                  <span>Revision <span data-testid="sequence">{item.head.sequence}</span></span>
                  <button type="button" disabled={pending !== null} onClick={() => void changeRole(item, item.head.role === "primary" ? "supporting" : "primary")}>
                    {pending === item.head.objectId ? "Saving…" : item.head.role === "primary" ? "Mark as supporting" : "Mark as primary"}
                  </button>
                </div>
                {item.sideLine.map((entry) => (
                  <p className="aside" key={entry.attemptId} data-testid="kept-aside">Kept aside: role {label(entry.role)}, based on revision {entry.basedOn}</p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
