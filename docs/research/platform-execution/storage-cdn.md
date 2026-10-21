# Ticket #73 — Private object storage + CDN / video delivery (research, 2026-10-21)

Scope: where Aiuteur V2 keeps private media (images, 4–12 s generated video takes of 5–80 MB, audio, creator reference uploads, NLE export ZIPs), how the browser plays it (signed URLs, byte ranges), and whether a managed video service is needed. This is research only: a dated SHORTLIST plus deciding facts. Ticket #74 decides.
Conventions: **Q** = quoted or paraphrased from the cited primary page (accessed 2026-10-21). **I** = my inference. "not verified" = I could not confirm it on a live primary page.

Scenario used for every cost figure (from the brief): 5 creators, 200 GB stored, 100 GB/month video egress.
Assumed operation counts (**I**): ~50k write/list ops/month (3,000 jobs × several outputs, plus thumbnails, uploads and lists) and ~1M read ops/month (byte-range GETs while scrubbing, plus image loads). Polling and steps happen in the DB or queue, not in storage, so the 2M poll executions add no storage ops.

## 1. Comparison table

| Option | Fit / limits | $ at scenario (per month) | Private access / signed URLs | Range, CORS, browser upload | Local dev / CI | Lock-in / exit | Multi-tenant isolation |
|---|---|---|---|---|---|---|---|
| **Cloudflare R2** | 5 TiB objects; 5 GiB single PUT; 1,000,000 buckets/account; 1 write/s per key [3] | **≈$2.85** (190 GB × $0.015; ops inside free tier; egress $0) [1]. +$5 if a Worker auth proxy is used [10] | SigV4 presign GET/PUT/HEAD/DELETE, 1 s–7 d. Works only on the `*.r2.cloudflarestorage.com` domain, not custom domains [2]. Temporary credentials can be scoped to a bucket and to **prefixes** [5] | Range ✅, conditional PUT If-None-Match is atomic [6]. CORS rules per bucket [2]. Presigned PUT ✅, POST form ❌ [2]. Multipart ✅ | wrangler/miniflare simulate R2 locally [9]. Any S3 emulator works for the S3 path | Full S3 API subset; exit = S3 copy (no egress fee) [1][6] | Prefix + temp creds scoped to a prefix [5]. Bucket-per-tenant is feasible (1M) [3]. API tokens scoped per bucket [7] |
| **AWS S3 (+CloudFront)** | Mature. Default 10,000 buckets/account [14] | S3 direct: ≈$4.60 storage + $0.25 PUT + $0.40 GET; egress 100 GB inside the 100 GB/mo free allowance (shared across all AWS) → **≈$5.25** (≈$14.25 if that allowance is used elsewhere) [11][12]. +CloudFront pay-as-you-go: 1 TB/mo free, S3→CF transfer waived → ≈$5.25 [15][16] | S3 presign ≤7 d (IAM user). With a role or STS credential the URL dies when the session ends (default 1 h) [13]. CloudFront signed URLs ✅, also on flat-rate plans [17] | Range ✅ (standard). Browser presigned PUT ✅. Malware scan via GuardDuty $0.09/GB + $0.215/1k objects [18] | LocalStack now needs an account and auth token; the free Hobby tier is non-commercial only [52][53]. MinIO community edition is unmaintained and source-only [51] | The reference S3 API; cheapest exit target is itself | IAM/STS session policy scoped to `acct/<id>/*` → presigned URLs inherit that scope [13] (**I**). Versioning pitfall (see notes) |
| **Backblaze B2** | $6.95/TB/mo; first 10 GB free; no minimum duration [19] | **≈$1.32** storage; egress free up to 3× stored; Class A/B/C API calls free [19] | S3-compatible presign for download and upload ✅ [20]. Max expiry: not verified | CORS ✅ [20]. Presigned POST ❌, IAM roles ❌, object tagging ❌ [20]. Range: not verified on page | Any S3 emulator | S3-compatible; free egress to Cloudflare/bunny/Fastly CDNs [19] | App keys restricted to a bucket/prefix exist (page not read: not verified) |
| **Supabase Storage** | Pro max file 500 GB; per-bucket size + MIME limits [26]. No versioning [24]. Empty-bucket hard limit 200k objects [28] | Pro $25 includes 100 GB storage + 250 GB egress + 250 GB cached egress → +100 GB × $0.0213 = **$2.13 on top of the $25 plan** (the plan is shared with the DB) [21] | Private buckets; `createSignedUrl(path, expiresIn)` (max not documented); signed upload URLs valid 2 h [22][27]. Signing key is separate from Auth keys; revoking needs support [22] | Resumable/S3 multipart ✅ [24]. CDN caches signed URLs per token; **an expired token's cached response keeps serving until the cache TTL ends** [25] | `supabase start` runs Storage locally in Docker (native runtime is experimental) [29] | S3-compatible endpoint (versioning ❌) [24]. Metadata lives in Postgres `storage.objects` | **RLS on `storage.objects`** with `storage.foldername(name)` = JWT sub [23]. The service key bypasses RLS entirely [23] (V1's failure mode) |
| **Google Cloud Storage** | Soft delete ON by default (7 d, billed) [32] | Storage 200 × ~$0.020 = $4.00; ops ≈$0.65; egress $0.12/GiB → $12 (or $0 under the Always-Free 100 GB from NA) → **≈$4.65–$16.65** [30] | V4 signed URL ≤7 d (604,800 s) [31]. Resumable session URI acts as a bearer token [31] | Range ✅ (standard, not re-verified) | fake-gcs-server etc. (not verified) | S3-interop via XML/HMAC (not verified this pass) | IAM per bucket; prefix scoping is weaker (**I**, not verified) |
| **Tigris** | Global S3-compatible store; zero egress [33] | 195 GB × $0.02 = $3.90 + A $0.20 + B $0.45 → **≈$4.55** [33] | Presign ≤**90 days**. Can presign with a custom domain (host rewrite) [34] | S3 semantics (range assumed; not verified). Warns about XSS when uploads are served on your own domain [34] | Any S3 emulator | S3-compatible | Per-bucket access keys (not verified this pass) |
| **Vercel Blob** | Private stores; blobs >512 MB never cached [35]; rate limits (Pro 120 simple ops/s) [35] | ≈$4.60 storage + 100 GB × $0.05 = $5 + ops ≈$0.65 → **≈$10** + Vercel Pro seat (not verified) [35]. Function-proxied private delivery adds Fast Data Transfer and Fast Origin Transfer [36] | `issueSignedToken` scoped by pathname, ops, MIME, max size; ≤7 d [37]. Vercel advises against serving private files >100 MB via a Function unless traffic is low [36] | Presigned PUT enforces `maximumSizeInBytes` and MIME types [37]. Range: not verified | No official local emulator (not verified) | Proprietary API (not S3) → exit means a copy job | Pathname-scoped delegation tokens [37]; unlimited stores [35] |
| **Bunny Storage + CDN** | $1/mo minimum [38][39] | 200 GB × $0.01 = $2 + 100 GB × $0.01 (EU/NA) = $1 → **≈$3** (Volume tier ≈$2.50) [38][39] | CDN token auth: Basic MD5 or Advanced SHA256 with expiry, IP/geo, **directory tokens** [40]. Turning on token auth disables IPv6 [40] | Range/CORS: not verified. Upload via Storage API (S3 compatibility not verified) | None | Proprietary storage API (not verified) | App-level only (**I**) |
| **Wasabi** | **1 TB minimum charge; 90-day minimum storage duration**; free egress only while egress ≤ stored [42][43] | **$7.99** (1 TB minimum). Deleted takes are billed out to 90 days [43] | S3 presign (not verified) | S3-compatible | Any S3 emulator | S3-compatible | Prefix/IAM-like policies (not verified) |
| **Mux** (video svc) | Priced per minute, not per GB [44] | ~1,333 stored min (**I**: 200 GB at ~20 Mb/s) × $0.003 = **$4.00**; delivery inside 100k free min; basic-quality input free; $20 PAYG credit → **≈$0 net** [44]. Originals must still be kept in object storage | Signed playback JWT. Playback stops at `exp` **even mid-play**; set exp ≥ duration [45] | HLS (+MP4 renditions as an add-on, price not verified) | None | Re-ingest needed to leave | Playback restrictions per environment (100 max) [45]; app-level |
| **Cloudflare Stream** | Storage prepaid in $5 blocks per 1,000 min [46] | 2 × $5 = $10 + ~667 min × $1/1k = **≈$10.67** [46] | Signed tokens; `exp` ≤ **24 h** after signing; signing keys revocable (≤1,000 keys) [47] | HLS/DASH; MP4 downloads billed by % delivered [46] | None | Re-ingest | App-level |
| **api.video** | Free sandbox: 30 s limit, watermark, deleted after 24 h [48] | 1,333 × $0.00285 + 667 × $0.0017 → **≈$4.93** [48] | Private videos; domain restriction $20/mo [48] | HLS | None | Re-ingest | App-level |
| **Bunny Stream** | $1 minimum [41] | Storage from $0.01/GB + CDN from $0.005/GB → **≈$2–4** (**I**) [41] | Token auth, "Media Cage" (not verified in detail) | HLS | None | Re-ingest | App-level |

## 2. Per-option notes

### Cloudflare R2
- **Q** Standard $0.015/GB-mo. Class A $4.50/M, Class B $0.36/M. Free tier: 10 GB-mo, 1M A, 10M B. Egress free via S3 API, Workers and r2.dev. DeleteObject and AbortMultipartUpload are free. Infrequent Access has a 30-day minimum and a $0.01/GB retrieval fee [1].
- **Q** Presigned URLs allow GET/HEAD/PUT/DELETE and last 1 s to 7 d. They can be reused until expiry. They are generated locally with no call to R2. "Presigned URLs work with the S3 API domain … and cannot be used with custom domains". For auth on a custom domain, use WAF HMAC validation, which needs the Pro plan or above. POST form uploads are not supported. Signing ContentType into a PUT makes a mismatched upload fail with 403 [2].
- **Q** Temporary credentials are bound to one bucket and a set of operations, and optionally to `prefixes`/`objects` paths. They can be minted through the API or signed locally as a JWT. Revoking the parent token kills them all at once [5]. **I**: this lets the server mint a URL-signing credential scoped to `acct/<id>/` per request, so a key-construction bug cannot sign another tenant's objects. Open question: whether presigned URLs can be built from temporary credentials (session token in the query). The R2 page shows this only for SDK clients. Not verified.
- **Q** Limits: 1,000,000 buckets per account; 50 bucket-management ops/s; key ≤1,024 B; single PUT ≤4.995 GiB; 10,000 parts; 1 concurrent write/s per key (429 above that) [3].
- **Q** Lifecycle rules are per prefix (max 1,000 rules) and can expire objects or abort incomplete multipart uploads. Objects are removed within ~24 h of expiry. Default rule: abort multipart uploads after 7 days [4]. **I**: a purge can be an immediate List(prefix) + DeleteObjects loop (deletes free; List is Class A), or a prefix-scoped expire rule as a backstop. The 1,000-rule cap means expire rules cannot be per-project at scale.
- **Q** S3 compatibility: GetObject Range ✅, If-Match/If-None-Match ✅, DeleteObjects ✅, ListObjectsV2 prefix/delimiter ✅, SSE-C ✅. Conditional PutObject is atomic: of concurrent `If-None-Match: *` writers, at most one wins (412 for the rest). Object tagging ❌, object lock ❌, bucket ACL ❌, PutBucketNotification over the S3 API ❌ [6]. Versioning does not appear among implemented operations (**I**, not explicitly verified). That is good for purges: no hidden noncurrent versions.
- **Q** Delivery options: a custom domain enables Cloudflare Cache, WAF token auth and Access. By default only some file types are cached ("Cache Everything" needed). r2.dev is rate-limited and dev-only [8]. Workers binding `get(key, {range: request.headers})` streams ranges. `wrangler dev` uses local storage by default [9]. Workers Paid is $5/mo with 10M requests and 30M CPU-ms included [10].
- **Q** Token scoping: "Object Read & Write" tokens can be limited to a set of buckets [7].
- Private-media patterns (**I**): (a) presigned GET on the r2.cloudflarestorage.com host, with no edge cache, which is fine for 1–5 users; (b) a Worker on a custom domain that verifies an app-issued HMAC/JWT and streams the R2 object with Range, adding $5/mo; (c) a custom domain plus WAF HMAC on Pro. Pro price not verified [54].

### AWS S3 + CloudFront
- **Q** S3 Standard $0.023/GB-mo for the first 50 TB, PUT $0.005/1k, GET $0.0004/1k, internet egress $0.09/GB after 100 GB/mo free. The live page's table did not render, so these figures come from the AWS page's own examples plus secondary 2026 summaries [11][12]. Treat as "verify in calculator". DELETE is free [11].
- **Q** Presign: an IAM user signs for up to 7 d (SDK/CLI). A role or STS credential means "the URL expires when the role session expires" (STS default 1 h). EC2 role credentials last ~6 h. "S3 checks the expiration … at the time of the HTTP request … if the connection drops and the client tries to restart the download after the expiration time passes, the download fails" [13]. **I**: every seek in a `<video>` is a new Range request, so once a URL expires the player can no longer seek or restart, even mid-session. Design for re-minting on 403 or pick a TTL longer than the session.
- **Q** Default bucket quota is 10,000 per account and can be raised [14]. **I**: bucket-per-tenant is possible but prefix + IAM is the normal pattern.
- **Q** CloudFront pay-as-you-go: always free 1 TB/mo egress, 10M requests, 2M CloudFront Function invocations. Then $0.085/GB in North America and Europe [16]. Flat-rate plans: Free $0 (100 GB, 1M requests, 5 GB S3 credit), Pro $15 (50 TB, 10M requests, 50 GB S3 credit). There are no overage charges, but sustained overuse may lead to "traffic delivery … adjusted" [15][17]. Signed URLs are listed as a flat-rate feature. Unsupported: multi-tenant distributions, OAI (use OAC) [17]. Transfer from S3 to CloudFront is waived [15].
- **Q** GuardDuty Malware Protection for S3: $0.09/GB scanned and $0.215 per 1,000 objects. The free tier covers 1 GB and 1,000 requests per month [18]. This is the only managed malware scanner found among these options. **I**: reference uploads of a few GB/month cost <$1.
- Versioning pitfall (**I**, standard S3 behavior, not re-verified): with versioning on, a delete adds a delete marker and noncurrent versions keep billing. A purge then needs version-aware deletes or a NoncurrentVersionExpiration rule. Keep versioning off for media buckets.

### Backblaze B2
- **Q** $6.95/TB/30 days, first 10 GB free, no minimum duration or file size. Free egress up to 3× average stored, then $0.01/GB. Unlimited free egress through partner CDNs (Cloudflare, bunny.net, Fastly…). Class A/B/C calls free; Class D $0.004/10k after 2,500/day [19].
- **Q** S3-compatible API supports pre-signed download and upload. Not supported: ACLs, IAM roles, object tagging, presigned POST browser uploads [20]. CORS is configurable [20].
- **I**: 100 GB/mo egress is far below 3× 200 GB, so egress costs $0. Without IAM roles there is no STS-style prefix-scoped minting. App keys with a name-prefix restriction exist, but I could not read that page in this pass (not verified).

### Supabase Storage
- **Q** Pro $25 includes 100 GB storage ($0.0213/GB beyond), 250 GB egress ($0.09/GB beyond) and 250 GB cached egress ($0.03/GB beyond). Free tier: 1 GB storage and a 50 MB file cap. Pro max file size is 500 GB. Spend caps are on by default on Pro [21][26].
- **Q** Private buckets can be read only through signed URLs or the `/object/authenticated/` path with the user's Authorization header. Signed URLs use a dedicated signing key that Auth key rotation does not affect. Revoking them requires contacting support [22]. Signed upload URLs are valid for 2 h [27].
- **Q** Access control is RLS on `storage.objects`. No policy means no uploads. An upload needs INSERT; upsert also needs SELECT and UPDATE. The documented pattern is `(storage.foldername(name))[1] = (select auth.jwt()->>'sub')`. "Service keys entirely bypass RLS policies" [23].
- **Q** Smart CDN treats each signed-URL token as its own cache key, so the first hit is always a miss. "Revoking or expiring a token does not purge its CDN cache entry". Deleting the object invalidates all cached entries within about 60 s [25]. **I**: because each minted URL starts with a miss, much private video egress counts as uncached ($0.09/GB beyond 250 GB), not cached ($0.03).
- **Q** S3 protocol: presigned SigV4 ✅, DeleteObjects ✅, multipart ✅. "S3 versioning is not supported" [24]. Deleting rows with SQL orphans the files: always delete through the Storage API. `remove()` takes at most 1,000 objects per call. Emptying a bucket via the API or dashboard fails above 200k objects (use `aws s3 sync --delete`) [28].
- **Q** Local dev: `supabase start` runs Postgres, Auth and Storage in Docker. An experimental native runtime exists for sandboxes and CI [29].
- Isolation (**I**): Supabase is the only option here where the store enforces per-tenant access in the database (RLS). That holds only if ordinary requests use the user's JWT. Server-side ingestion of provider output has no user JWT, which pushes code back toward the service key, the exact V1 failure. Fixes: a scoped DB role or a custom-claims JWT minted per account for the worker. Feasibility not verified.

### Google Cloud Storage
- **Q** Standard storage $0.000027397/GiB-hour, about $0.020/GiB-mo (**I**: ×730). Class A $0.005/1k, Class B $0.0004/1k. Internet egress $0.12/GiB (0–10 TiB). Always Free: 5 GB-mo, 5k A, 50k B, 100 GB egress from North America (us-west1/us-central1/us-east1 only) [30].
- **Q** V4 signed URLs last at most 604,800 s (7 d) and work only via the XML API. A resumable session URI acts as a bearer token [31].
- **Q** Soft delete is on by default with 7-day retention (configurable 7–90 d, 0 disables it). Soft-deleted objects keep accruing storage charges. Lifecycle rules do not affect soft-deleted objects [32]. **I**: this is a purge pitfall. "Deleted" project media stays billed and restorable for 7 days unless soft delete is turned off per bucket.

### Tigris
- **Q** Standard $0.02/GB-mo, Class A $0.005/1k, Class B $0.0005/1k, DELETE free, egress free. Free tier: 5 GB, 10k A, 100k B [33].
- **Q** Presigned URLs can last up to 90 days and can use a custom domain (host rewrite). The docs warn about XSS from user-uploaded HTML/SVG on your domain [34]. **I**: if media is served from the app's own domain, use a separate media hostname and `Content-Disposition`/`nosniff`.

### Vercel Blob
- **Q** Storage $0.023/GB in iad1, transfer $0.05/GB, simple ops $0.40/M, advanced ops $5/M (pricing example). Cache hits are not simple ops. Blobs >512 MB are never cached [35]. Private stores are delivered through your own Function, costing Blob Data Transfer + Fast Origin Transfer + Fast Data Transfer [36]. Vercel does not recommend serving files >100 MB through private stores unless traffic is low [36].
- **Q** Signed URLs: `issueSignedToken` takes pathname, operations, `validUntil` (≤7 d), `allowedContentTypes` and `maximumSizeInBytes`. `presignUrl` is HMAC-only and can run in the browser [37]. **I**: this is a better browser-upload story than S3 PUT presign, because the size cap is enforced. The cost is a proprietary API.

### Bunny Storage / CDN / Stream
- **Q** Storage $0.01/GB per region (HDD). CDN $0.01/GB in EU/NA (Volume network $0.005). $1/mo minimum. Free traffic from storage to CDN, no API fees [38][39].
- **Q** Token auth: Basic (MD5) or Advanced (SHA256: expiry, IP, geo, directory tokens, speed limits). Turning it on disables IPv6 [40]. Bunny Stream: encoding free, storage from $0.01/GB, CDN from $0.005/GB [41].

### Wasabi
- **Q** $7.99/TB/mo with a 1 TB minimum charge and a 90-day minimum storage duration ("Timed Deleted Storage"). Overwrites also count as deletes. Free egress holds only while monthly egress ≤ active storage, or Wasabi may "limit or suspend" service [42][43]. **I**: this does not fit "many takes, discard, purge by project". Excluded.

### Managed video services (Mux, Cloudflare Stream, api.video, Bunny Stream)
- **Q** Mux 1080p basic: input free, storage $0.003/min/mo, delivery $0.001/min after 100,000 free min/mo, $20 PAYG credit [44]. Signed JWT: "When the signed URL expires, the URL will no longer be playable, even if playback has already started" [45].
- **Q** Cloudflare Stream: ingest and encoding free; $5 per 1,000 stored minutes (prepaid); $1 per 1,000 delivered minutes. Preloading and buffering are billable [46]. Signed token `exp` must be ≤24 h after signing [47].
- **Q** api.video: hosting from $0.00285/min, delivery from $0.0017/min, encoding free [48].
- **Is HLS needed for 4–12 s clips? (I, with evidence.)** Browsers' media players use HTTP Range requests for random access (`Accept-Ranges: bytes` → 206 Partial Content) [49]. R2, S3 and GCS serve ranges on presigned GETs [6][13]. A progressive MP4 needs its `moov` index at the front (`-movflags +faststart`) to start before it is fully downloaded [50]. For 4–12 s clips a range-served MP4 is enough to play and scrub. HLS/ABR only pays off for (a) slow links facing high-bitrate takes (80 MB / 12 s ≈ 53 Mb/s, **I**), and (b) long assembled timelines (up to 20 min). Cheaper fallback for (a): one H.264 preview rendition per take, made by a transcode job and stored next to the original. HLS packaging is not required for that.
- **What NLE export needs (I):** original-quality files (not service transcodes) at stable names, plus a ZIP or manifest of a project's selected takes. With 250 shots × an 80 MB cap, an export can reach ~20 GB. That favors zero-egress storage (R2, Tigris, B2 inside 3×) and a streaming ZIP writer or a stored ZIP object with a long presign (≤7 d on R2/S3/GCS, ≤90 d on Tigris). Video services store transcodes, so originals stay in object storage anyway. A video service therefore adds cost and a second copy to purge, without replacing object storage.

### Local development / CI
- **Q** MinIO's GitHub repo says "THIS REPOSITORY IS NO LONGER MAINTAINED". The community edition is source-only with no binaries, and "AIStor Free" is the suggested replacement [51].
- **Q** LocalStack: since 2026.03.0 an auth token or CI auth token is required. The community image was folded into the single image. The free Hobby plan is for non-commercial use only [52][53].
- **Q** R2: `wrangler dev` uses local storage by default [9]. Supabase: local Storage via the CLI [29].
- **I**: for an S3-API path in CI without the cloud, candidates are AIStor Free, MinIO built from source, or other S3-compatible servers (Garage, SeaweedFS, S3Mock). None of these alternatives was verified in this pass.

## 3. Cross-cutting design facts (apply to any S3-compatible choice)
- **Ingest of provider output (80 MB clips, vendor URLs expire in ~1 h).** The worker streams vendor URL → PutObject. A single PUT needs a known Content-Length (≤5 GiB on R2 [3]); with an unknown length, use multipart (I). Write to a content-hash key with `If-None-Match: *` (R2: atomic, 412 to losers [6]). A retried "fetching" step is then idempotent (I). R2 caps writes to one key at 1/s, which content-addressed keys never hit (I) [3].
- **Key layout (I):** `acct/{accountId}/proj/{projectId}/{kind}/{sha256}.{ext}`. Content-hash keys are immutable, so `Cache-Control: immutable` is safe. Purge by account or project = List(prefix) + DeleteObjects. Per-tenant signing scope = R2 temp-cred prefix [5] or an STS session policy (S3).
- **Browser upload of reference media.** Presigned PUT signs Content-Type (R2 [2]). It does not cap size on R2/S3, which have no POST policy (R2/B2 do not support POST [2][20]). I: HEAD after upload and reject or delete anything over the limit, or proxy through a Worker. Vercel Blob and Supabase enforce size and MIME limits natively [37][26]. Malware scanning: only AWS has it managed [18]. Elsewhere, a scan job is needed or the risk is accepted (I: inputs are images/video sent to AI vendors, never executed).
- **CORS.** Needed for presigned PUT from the app origin and for `<video crossorigin>` frame grabs. Configured per bucket on R2/S3/B2 [2][20].
- **Signed URL TTL vs playback.** Max TTLs: R2 7 d [2], S3 7 d or the session lifetime [13], GCS 7 d [31], Tigris 90 d [34], Vercel 7 d [37], CF Stream 24 h [47], Supabase signed upload 2 h [27]. Expiry is checked per request [13], so I: mint TTL ≥ expected session (e.g. 2–12 h), and have the player re-mint and resume at `currentTime` on 403. Mux/Stream need exp ≥ playback duration [45][47].

## 4. Deciding facts (for #74)
1. **Egress price for originals and exports.** R2, Tigris, Wasabi and Bunny's storage→CDN hop are $0. B2 is $0 up to 3× stored. S3 is $0.09/GB after 100 GB (or $0 behind CloudFront up to 1 TB). GCS is $0.12/GiB. Supabase is $0.09/GB beyond 250 GB uncached [1][33][19][11][16][30][21]. At the scenario every option costs under ~$17/mo, so price differences are small. Egress becomes decisive only at low-TB scale and for ZIP exports.
2. **Per-tenant scoping of URL minting.** R2 temp credentials scoped to a prefix [5], S3 STS session policies [13], and Supabase RLS on `storage.objects` [23] are the only store-enforced scopes. Supabase's only server bypass is the RLS-bypassing service key [23].
3. **Presigned URLs on a custom domain.** R2 presigned URLs work only on the r2.cloudflarestorage.com host; a custom domain needs a Worker or WAF HMAC (Pro) [2]. Tigris presigns on a custom domain [34]. CloudFront signed URLs work on a custom domain [17].
4. **Purge semantics.** No versioning on R2 (I) or Supabase [24]. GCS soft delete bills for 7 days by default [32]. Wasabi bills deletes out to 90 days [43]. Supabase API-only deletes, ≤1,000 per call, bucket-empty fails above 200k objects [28]. R2 deletes are free [1].
5. **Bucket-per-tenant headroom.** R2 allows 1,000,000 buckets [3], S3 10,000 by default [14], Vercel unlimited stores [35].
6. **Video service not required for 4–12 s clips.** Range-served faststart MP4 plays and scrubs [49][50]. Services add a transcoded second copy; originals must stay in object storage for NLE export (I).
7. **Local/CI story.** R2 has first-party local simulation [9] and Supabase runs locally [29]. The generic S3 emulators changed in 2025–26: MinIO is unmaintained [51] and LocalStack needs a token, with a non-commercial free tier [52][53].
8. **Cache vs revocation (Supabase).** A cached signed response outlives token expiry. Only deleting the object revokes access [25].

## 5. Limitations and fallbacks
- R2 presigned URLs cannot use a custom domain [2] → fallback: serve from the S3 host directly (no edge cache, acceptable for 1–5 users), or a ~50-line Worker that does token auth and Range pass-through ($5/mo) [9][10].
- Presigned PUT cannot cap upload size on R2/S3 → fallback: verify size with HEAD after upload and delete if too large, or use multipart with server-issued part URLs (I).
- Signed URLs expire mid-session → fallback: the player re-mints on 403 and seeks to `currentTime` (I) [13][45].
- 80 MB / 53 Mb/s takes stutter on slow links → fallback: a per-take H.264 preview rendition (transcode job), then Mux or Cloudflare Stream only if ABR proves necessary [44][46].
- Supabase server-side ingest without a user JWT → fallback: a per-account scoped credential or DB role, never the service key in request paths (I) [23].
- GCS soft delete / S3 versioning → turn them off on media buckets, or purges stay billed and restorable (I) [32].
- No managed malware scan outside AWS → accept the risk for non-executable media, or scan in a job (I) [18].
- **Constitution amendment: none needed.** "Failures visible / nothing stuck" maps to: a failed ingest is a Job failure state; a URL expiry produces a visible re-mint path; a purge is a Job with verifiable completion (List(prefix) returns empty).

## 6. Not verified / open
- AWS S3 Standard $0.023/GB, PUT/GET and $0.09/GB rates: the live table did not render, so they come from AWS's own example text plus secondary 2026 summaries [11][12].
- Cloudflare Pro plan price (needed for WAF HMAC on a custom domain) [54]. Whether Cloudflare's self-serve terms restrict video served through Cache in front of R2 on a custom domain.
- Whether R2 presigned URLs can be minted from prefix-scoped temporary credentials (session token in the query string) [5].
- R2 versioning absence (inferred from the S3-compat table, not stated outright) [6].
- B2: presign max expiry, Range on presigned GET, app-key prefix restriction [20].
- Supabase: maximum `expiresIn` for `createSignedUrl`; storage-bucket count limits; whether storage egress shares the same 250 GB pool as DB/API egress [21][22].
- Tigris and Bunny: per-bucket key scoping, Range/CORS details; Bunny Storage S3 compatibility.
- Vercel Blob: whether Range is honoured on presigned GET; Pro seat price.
- Mux/Cloudflare Stream: per-asset minimum billed duration for <1 min clips; Mux MP4 static rendition and original-download pricing; whether Cloudflare Media Transformations can make preview renditions from R2 ($0.50/1k, 5k free [46]).
- Minutes-per-GB conversion (~20 Mb/s → ~1,333 stored min) is my assumption; real bitrates of the provider outputs set the video-service cost.

## Sources (all accessed 2026-10-21)
[1] https://developers.cloudflare.com/r2/pricing/
[2] https://developers.cloudflare.com/r2/api/s3/presigned-urls/
[3] https://developers.cloudflare.com/r2/platform/limits/
[4] https://developers.cloudflare.com/r2/buckets/object-lifecycles/
[5] https://developers.cloudflare.com/r2/api/s3/temporary-credentials/
[6] https://developers.cloudflare.com/r2/api/s3/api/
[7] https://developers.cloudflare.com/r2/api/tokens/
[8] https://developers.cloudflare.com/r2/buckets/public-buckets/
[9] https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
[10] https://developers.cloudflare.com/workers/platform/pricing/
[11] https://aws.amazon.com/s3/pricing/
[12] Secondary (rates only): https://upstash.com/blog/aws-s3-pricing-explained-2026 ; https://www.cloudzero.com/blog/s3-pricing
[13] https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
[14] https://docs.aws.amazon.com/AmazonS3/latest/userguide/BucketRestrictions.html
[15] https://aws.amazon.com/cloudfront/pricing/
[16] https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
[17] https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
[18] https://aws.amazon.com/guardduty/pricing/
[19] https://www.backblaze.com/cloud-storage/pricing
[20] https://www.backblaze.com/docs/cloud-storage-s3-compatible-api
[21] https://supabase.com/pricing
[22] https://supabase.com/docs/guides/storage/serving/downloads
[23] https://supabase.com/docs/guides/storage/security/access-control
[24] https://supabase.com/docs/guides/storage/s3/compatibility
[25] https://supabase.com/docs/guides/storage/cdn/smart-cdn
[26] https://supabase.com/docs/guides/storage/uploads/file-limits
[27] https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
[28] https://supabase.com/docs/guides/storage/management/delete-objects
[29] https://supabase.com/docs/guides/local-development/cli/getting-started
[30] https://cloud.google.com/storage/pricing
[31] https://cloud.google.com/storage/docs/access-control/signed-urls
[32] https://cloud.google.com/storage/docs/soft-delete
[33] https://www.tigrisdata.com/pricing/
[34] https://www.tigrisdata.com/docs/objects/presigned/
[35] https://vercel.com/docs/vercel-blob/usage-and-pricing
[36] https://vercel.com/docs/vercel-blob/private-storage
[37] https://vercel.com/docs/vercel-blob/vercel-signed-urls
[38] https://bunny.net/pricing/storage/
[39] https://bunny.net/pricing/cdn/
[40] https://docs.bunny.net/docs/cdn-token-authentication
[41] https://bunny.net/pricing/stream/
[42] https://wasabi.com/pricing
[43] https://wasabi.com/pricing/faq
[44] https://www.mux.com/pricing
[45] https://www.mux.com/docs/guides/secure-video-playback
[46] https://developers.cloudflare.com/stream/pricing/
[47] https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
[48] https://api.video/pricing
[49] https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
[50] https://ffmpeg.org/ffmpeg-formats.html (movflags faststart)
[51] https://github.com/minio/minio
[52] https://blog.localstack.cloud/localstack-for-aws-release-2026-03-0
[53] https://www.localstack.cloud/pricing
[54] https://www.cloudflare.com/plans/ (Pro price not extractable)
