import { draftTreatmentResultSchema, eventSchema, generationReadSchema, projectSchema, sourceMaterialRevisionSchema, treatmentOptionReadSchema, type StudioEvent } from "@aiuteur/contract";

const NIL_ACCOUNT = "00000000-0000-4000-8000-000000000000";
const SYNTHETIC_PASTE = "INT. HARBOUR OFFICE — DAWN\n\nMara carries the sealed letter past the sleeping clerks. Synthetic smoke text.";

/** The staging smoke Account (OPERATIONAL-BASELINE §4.2). The owner provisions it; its login is read by the smoke only. */
export interface SmokeAccount {
  readonly email: string;
  readonly password: string;
  readonly accountId: string;
  /** The deployment's public origin, which the API requires on every command. */
  readonly origin: string;
}

type Send = typeof fetch;
interface SseFrame { readonly id: number; readonly event: StudioEvent }

/** Reads frames from an event stream until `stop` says enough, the stream ends, or the time is up; then disconnects. */
export async function readEvents(send: Send, url: URL, cookie: string, lastEventId: number | null, stop: (frames: SseFrame[]) => boolean, timeoutMs: number): Promise<SseFrame[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const frames: SseFrame[] = [];
  try {
    const response = await send(url, { headers: { cookie, accept: "text/event-stream", ...(lastEventId === null ? {} : { "last-event-id": String(lastEventId) }) }, signal: controller.signal });
    if (response.status !== 200 || !response.body?.getReader) throw new Error(`event stream answered ${response.status}`);
    if (!response.headers.get("content-type")?.startsWith("text/event-stream")) throw new Error("event stream has the wrong content type");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const id = /^id: (\d+)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (id !== undefined && data !== undefined) frames.push({ id: Number(id), event: eventSchema.parse(JSON.parse(data)) });
      }
      if (stop(frames)) { controller.abort(); break; }
    }
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally { clearTimeout(timer); }
  return frames;
}

/**
 * The staging smoke the deploy runs against a live `web` (OPERATIONAL-BASELINE §4.2): deep health is green; an unauthenticated
 * request is refused as the contract says; then, as the smoke Account, sign in, run one fake-provider Job end to end
 * (paste, Treatment draft, settled Generation, its Treatment Option), and prove the event stream: read the Job's events, reconnect
 * with `Last-Event-ID` and receive exactly the events after it, reconnect at the end and receive none. It is run by the previous
 * image against the new schema (the compatibility smoke) and by the new image after the swap. Empty result means pass.
 */
export async function runSmoke(baseUrl: string, account: SmokeAccount, send: Send = fetch): Promise<string[]> {
  const problems: string[] = [];
  const fail = (message: string): string[] => { problems.push(message); return problems; };
  const request = (path: string, init: RequestInit = {}) => send(new URL(path, baseUrl), { ...init, signal: init.signal ?? AbortSignal.timeout(20_000) });
  try {
    // Not listening yet is "not ready", which the deploy retries; anything after this point is a real failure.
    const deep = await request("/healthz/deep").catch((): null => null);
    if (deep === null) return fail("/healthz/deep unreachable");
    if (deep.status !== 200) return fail(`/healthz/deep answered ${deep.status}`);
    const refused = await request(`/api/studios/${NIL_ACCOUNT}/projects`);
    const refusedBody: unknown = await refused.json().catch(() => null);
    if (refused.status !== 401 || (refusedBody as { code?: unknown } | null)?.code !== "unauthenticated") return fail(`unauthenticated project list answered ${refused.status}, expected 401 unauthenticated`);

    const command = (cookie: string, key: string) => ({ origin: account.origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": key, cookie });
    const key = () => crypto.randomUUID();
    const signIn = await request("/api/auth/sign-in/email", { method: "POST", headers: command("", key()), body: JSON.stringify({ email: account.email, password: account.password }) });
    const cookie = signIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    if (signIn.status !== 200 || cookie === "") return fail(`sign-in as the smoke Account answered ${signIn.status}`);

    const base = `/api/studios/${account.accountId}`;
    const created = await request(`${base}/projects`, { method: "POST", headers: command(cookie, key()) });
    if (created.status !== 201) return fail(`creating a project answered ${created.status}`);
    const project = projectSchema.parse(await created.json());
    const pasted = await request(`${base}/projects/${project.projectId}/source-material`, { method: "POST", headers: command(cookie, key()), body: JSON.stringify({ text: SYNTHETIC_PASTE }) });
    const pasteBody = (await pasted.json().catch(() => null)) as { result?: string; revision?: { objectId?: string } } | null;
    if (pasted.status !== 201 || pasteBody?.result !== "Applied" || !pasteBody.revision?.objectId) return fail(`pasting Source Material answered ${pasted.status}`);
    const source = `${base}/projects/${project.projectId}/source-material/${pasteBody.revision.objectId}`;
    sourceMaterialRevisionSchema.parse(pasteBody.revision);

    const drafted = await request(`${source}/treatment-drafts`, { method: "POST", headers: command(cookie, key()), body: JSON.stringify({}) });
    const draft = draftTreatmentResultSchema.parse(await drafted.json());
    if (draft.result !== "generation") return fail(`the Treatment draft answered ${draft.result}`);
    const generationId = draft.generation.generationId;
    // The Job is claimed by web's text fast path (RUNTIME-PLATFORM §4.6); read the Generation back until it settles.
    let generation = draft.generation;
    for (let attempt = 0; attempt < 30 && generation.outcome === null; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      generation = generationReadSchema.parse(await (await request(`${base}/projects/${project.projectId}/generations/${generationId}`, { headers: { cookie } })).json());
    }
    if (generation.outcome?.outcome !== "succeeded" || generation.outcome.outputs.length !== 1) return fail(`the fake-provider Job did not succeed (${generation.outcome?.outcome ?? "unsettled"})`);
    if (!generation.testProvider) return fail("the Generation is not marked as a test provider");
    const output = generation.outcome.outputs[0]!;
    const option = treatmentOptionReadSchema.parse(await (await request(`${base}/projects/${project.projectId}/treatment-options/${output.objectId}`, { headers: { cookie } })).json());
    if (option.generationId !== generationId || option.sequence !== output.sequence) return fail("the Treatment Option does not carry the settled Generation");

    // Event stream: from the start, until this Generation's settlement arrives.
    const stream = new URL(`${base}/events`, baseUrl);
    const settledFor = (frames: SseFrame[]) => frames.some((frame) => frame.event.type === "generation.settled" && frame.event.generationId === generationId);
    const first = await readEvents(send, stream, cookie, null, settledFor, 20_000);
    if (!settledFor(first)) return fail("the event stream never delivered this Generation's settlement");
    const ids = first.map((frame) => frame.id);
    if (ids.some((id, index) => index > 0 && id <= ids[index - 1]!)) return fail("event stream ids are not strictly increasing");
    if (!first.some((frame) => frame.event.type === "job.state_changed" && frame.event.generationId === generationId)) return fail("the event stream carried no Job state change for this Generation");
    // Reconnect from the middle: exactly the events after the cursor, in order, nothing repeated.
    const cursor = ids[Math.max(0, ids.length - 2)]!;
    const expected = first.filter((frame) => frame.id > cursor).map((frame) => frame.id);
    const replay = await readEvents(send, stream, cookie, cursor, (frames) => frames.length >= expected.length, 20_000);
    if (JSON.stringify(replay.map((frame) => frame.id)) !== JSON.stringify(expected)) return fail(`reconnecting after event ${cursor} replayed [${replay.map((frame) => frame.id)}], expected [${expected}]`);
    // Reconnect at the head: nothing is replayed.
    const head = ids[ids.length - 1]!;
    const none = await readEvents(send, stream, cookie, head, (frames) => frames.length > 0, 3_000);
    if (none.length > 0) return fail("reconnecting at the head replayed events");
  } catch (error) {
    return fail(`smoke could not complete: ${error instanceof Error ? error.constructor.name : "error"}`);
  }
  return problems;
}
