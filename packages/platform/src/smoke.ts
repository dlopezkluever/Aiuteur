const NIL_ACCOUNT = "00000000-0000-4000-8000-000000000000";

/**
 * The staging smoke the deploy runs against a live `web`: deep health is green, and a request without a session is
 * refused by the API the way the contract says. It is run by the previous image against the new schema (the
 * compatibility smoke), and again by the new image after the swap. Signing in and a fake-provider Job need the staging
 * smoke Account, which the owner has not provisioned; they join this list with it. Empty result means pass.
 */
export async function runSmoke(baseUrl: string, send: typeof fetch = fetch): Promise<string[]> {
  const problems: string[] = [];
  const get = async (path: string) => {
    try { return await send(new URL(path, baseUrl), { signal: AbortSignal.timeout(10_000) }); } catch { problems.push(`${path} unreachable`); return null; }
  };
  const deep = await get("/healthz/deep");
  if (deep && deep.status !== 200) problems.push(`/healthz/deep answered ${deep.status}`);
  const refused = await get(`/api/studios/${NIL_ACCOUNT}/projects`);
  if (refused) {
    const body: unknown = await refused.json().catch(() => null);
    if (refused.status !== 401 || (body as { code?: unknown } | null)?.code !== "unauthenticated") problems.push(`unauthenticated project list answered ${refused.status}, expected 401 unauthenticated`);
  }
  return problems;
}
