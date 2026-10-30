import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIA_REFUSALS, REFUSAL_REASONS, readVocabulary, type CharacterRead } from "@aiuteur/contract";
import { call, command } from "./api.ts";
import type { Navigate } from "./app.tsx";

const newAction = () => crypto.randomUUID();
const TYPE_LABELS: Record<string, string> = { "image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WebP" };
/** What the creator reads for a refused upload. An unknown reason is shown neutrally (VC6). */
function refusalText(raw: unknown) {
  const media = readVocabulary(MEDIA_REFUSALS, raw);
  if (media.known) return {
    "upload-missing": "The upload did not arrive. Choose the image again.",
    empty: "That file is empty.",
    "too-large": "That image is too large. The limit is 10 MB.",
    undecodable: "That file is not an image Aiuteur can read.",
    "type-mismatch": "That file is not the kind of image its name says. Use a PNG, JPEG or WebP image.",
  }[media.value];
  return readVocabulary(REFUSAL_REASONS, raw).known ? "That change was not accepted." : "That upload was not accepted.";
}

/**
 * The image a Character shows. The URL is minted by the server for this one image and expires; the client asks for it
 * each time it renders the reference, and once more if the browser reports the link has stopped working (PERSISTENCE §7.3).
 */
function ReferenceImage({ params, character }: { params: Record<string, string>; character: CharacterRead }) {
  const [url, setUrl] = useState<string | null>(null);
  const retried = useRef(false);
  const hash = character.reference?.media.hash;
  const mint = useCallback(async () => {
    const answer = await call("GET /api/studios/:accountId/projects/:projectId/characters/:objectId/reference/view", { ...params, objectId: character.objectId });
    setUrl(answer.ok ? answer.value.url : null);
  }, [params.accountId, params.projectId, character.objectId, hash]);
  useEffect(() => { retried.current = false; void mint(); }, [mint]);
  if (!character.reference) return <p className="no-reference" data-testid="no-reference">No reference image yet.</p>;
  const { media } = character.reference;
  return (
    <>
      {url && <img className="reference" data-testid="reference" src={url} width={media.width} height={media.height} alt={`Reference image for ${character.name}`}
        onError={() => { if (!retried.current) { retried.current = true; void mint(); } }} />}
      <div className="meta"><span data-testid="reference-facts">{TYPE_LABELS[media.contentType] ?? "Image"} · {media.width}×{media.height}</span></div>
    </>
  );
}

/** The T0 World step, by hand: Characters and their uploaded reference images. Everything shown is the last read model. */
export function WorldScreen({ accountId, projectId, navigate }: { accountId: string; projectId: string; navigate: Navigate }) {
  const [characters, setCharacters] = useState<readonly CharacterRead[] | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const createAction = useRef(newAction());
  const params = { accountId, projectId };

  const load = useCallback(async () => {
    const answer = await call("GET /api/studios/:accountId/projects/:projectId/characters", { accountId, projectId });
    if (answer.ok) { setCharacters(answer.value.characters); return; }
    if (answer.status === 401) window.location.assign("/");
    else if (answer.status === 404) navigate("/", true);
    else setProblem("Could not load this project. Reload and try again.");
  }, [accountId, projectId, navigate]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setPending("create"); setProblem(null);
    const answer = await command("POST /api/studios/:accountId/projects/:projectId/characters", params, { name }, createAction.current);
    if (answer.ok && answer.value.result === "Applied") { setName(""); createAction.current = newAction(); }
    else setProblem("That character was not added. Try again.");
    await load();
    setPending(null);
  };

  const upload = async (character: CharacterRead, file: File) => {
    setPending(character.objectId); setProblem(null);
    const ticket = await call("POST /api/studios/:accountId/projects/:projectId/uploads", params);
    const sent = ticket.ok && (await fetch(ticket.value.link.url, { method: "PUT", body: file, headers: { "content-type": file.type || "application/octet-stream" } }).catch(() => null))?.ok === true;
    if (!ticket.ok || !sent) setProblem("The upload did not go through. Try again.");
    else {
      const answer = await command("POST /api/studios/:accountId/projects/:projectId/characters/:objectId/reference", { ...params, objectId: character.objectId }, { uploadId: ticket.value.uploadId }, newAction());
      if (!answer.ok) setProblem("That upload was not accepted.");
      else if (answer.value.result === "Refused") setProblem(refusalText(answer.value.reason));
      else if (answer.value.result !== "Applied") setProblem("That upload was not accepted.");
    }
    await load();
    setPending(null);
  };

  return (
    <section>
      <h1>World</h1>
      <p className="lead">Add a character and give it a reference image.</p>
      {problem && <p className="error" role="alert">{problem}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label>Character name<input name="character-name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="primary" type="submit" disabled={name.trim() === "" || pending !== null}>{pending === "create" ? "Adding…" : "Add character"}</button>
      </form>
      <section aria-label="Characters">
        <h2>Characters</h2>
        {characters === null ? <p>Loading…</p> : characters.length === 0 ? <p>No characters yet.</p> : (
          <ul className="plain">
            {characters.map((character) => (
              <li className="card" key={character.objectId} data-object-id={character.objectId} data-testid="character">
                <h3 data-testid="character-name">{character.name}</h3>
                <ReferenceImage params={params} character={character} />
                <label className="meta">{character.reference ? "Replace reference image" : "Upload reference image"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending !== null}
                    onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(character, file); }} />
                </label>
                {pending === character.objectId && <p className="aside" role="status">Uploading…</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
