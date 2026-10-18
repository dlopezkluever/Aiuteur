# 11 Alternative & Unbuilt Ideas

> Scope: product directions, platform expansions, and side concepts that fit no other domain doc. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

Most unbuilt ideas sit in their domain docs (02B, 04, 05, 06, 06B, 07, 08, 09, 10), tagged `[future]`, `[planned]`, or `[alt]`. Examples include the Voice-Actinator performance-to-animation concept (WD-IDEA-AV-030), third-party publishing integrations (WD-IDEA-AV-080), content translation (WD-IDEA-STORY-128), and VR headset blocking (WD-IDEA-SHOT-202). This doc holds only what has no domain home.

## Adjacent creative products

- **WD-IDEA-ALT-001** [voice,future] "Your remix": take scenes from an existing movie or show and apply the user's fan-fiction plot or twist while the characters look and sound the same (e.g. Luke joins Vader in *Return of the Jedi*). Length ranges from a 60-second social media gag to a full fan film. Legal risk is a flagged concern. Related: Post-MVP Streamline candidate in WD-IDEA-FLOW-130. ‹src: new-tasks›
- **WD-IDEA-ALT-002** [voice,future] Live-action hybrid for everyday aspiring actors and directors: users film themselves against a green screen or in their bedroom. AI extracts the actor and small props, enhances costumes and props, replaces the environment with a location asset (existing worlds or novel ones), and inserts AI side characters who talk with or fight the actor (see 02B, 06B). Related: Post-MVP Streamline candidate in WD-IDEA-FLOW-130. ‹src: new-tasks, streamlined-input-process-consolidated›
- **WD-IDEA-ALT-003** Non-narrative content domains, each with its own visual emphasis (see 08; the educational domain's nearest existing home is WD-IDEA-INPUT-010): ‹src: Frame_Video_Prompt_Format_Guide›
  - *Corporate*: executive presence, brand-compliant environments, authority lighting, minimal camera movement.
  - *Educational*: uncluttered compositions, clear pacing, explanatory gestures.
  - *Marketing/social*: hook-worthy first frame, action within the first 2 seconds, product prominence, call-to-action delivery.

## Platform reach

- **WD-IDEA-ALT-004** [future] Cross-platform: installable web app with offline viewing, a mobile-optimized interface, native iOS/Android and desktop apps, and tablet split-view with Apple Pencil/stylus input. Conflicts with desktop-first positioning (see 01). Related: WD-IDEA-PHIL-030. ‹src: Post-MVP-tasklist, missing_todos-not-sure›
- **WD-IDEA-ALT-005** [future] Localization: multi-language UI, regional content guidelines, cultural sensitivity checks, regional templates, and local currency and payments. Translation of generated content lives in WD-IDEA-STORY-128. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-006** [future] Public programmatic API with keys, rate limits, SDKs, and usage analytics. ‹src: Post-MVP-tasklist›

## Ecosystem and community

- **WD-IDEA-ALT-007** [future] Template marketplace: users submit, preview, rate, and sell project templates, with revenue sharing. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-008** [future] Public project gallery with likes, bookmarks, featured projects, and curators, plus social sharing with preview cards and an embeddable player. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-009** [future] Community learning: forums with reputation and expert badges, user-created interactive tutorials, and a certification program. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-010** [future] Creative challenges and contests with submissions, voting, leaderboards, prizes, and archives. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-011** [future] Educational content library: filmmaking best-practices guide, prompt-engineering guide, case studies, workflow templates, and glossary, backed by ticket and live-chat support. ‹src: Post-MVP-tasklist›

## Marketing

- **WD-IDEA-ALT-012** [voice] Landing-page hero: a large section filling most of the window, with white text and buttons over a dark-tinted looping video. Headline: "A new era of motion picture is here; Indie Storytellers, REJOICE", followed by a problem statement about AI (unfinished in the source). ‹src: 3.7-location-pre-planning›

## Trust, safety, and rights

- **WD-IDEA-ALT-013** User-generated media must not be reachable by anyone who has its link. Production needs private, time-limited, authenticated access to user images and videos. Related: the expiring export download links in WD-IDEA-AV-055. ‹src: Totally-New-Features›
- **WD-IDEA-ALT-014** [future] Content IP protection: watermarking, content provenance tracking, usage rights and licensing options, and commercial-use restrictions. ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-015** [future] Safety and compliance: AI content moderation with human review and appeals, content ratings, age verification and parental controls, and GDPR data export and right to be forgotten. Related: WD-IDEA-STORY-089 (provider-censorship workarounds) and WD-IDEA-GEN-076 (person-generation safety setting). ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-016** [future] Enterprise: SSO, immutable searchable audit logs, data residency by region, 2FA, IP allow-listing, and session policies. ‹src: Post-MVP-tasklist›

## Operating the business

- **WD-IDEA-ALT-017** [future] Admin and business tools: user management with support impersonation, usage quotas, revenue and margin analysis, subscription management, feature flags, A/B tests, AI provider switching, and maintenance mode. Related: WD-IDEA-GEN-280 (per-provider kill switches). ‹src: Post-MVP-tasklist›
- **WD-IDEA-ALT-018** [future] Product observability: AI prompt/response tracing and prompt-experiment tracking to debug generation quality, plus user analytics with funnels, session recording, and an in-app feedback system. The AI tracing part above is covered by WD-IDEA-CONT-029 and WD-IDEA-GEN-285. ‹src: Post-MVP-tasklist, missing_todos-not-sure›
- **WD-IDEA-ALT-019** [future] Scale to thousands of concurrent users and large projects: horizontal scaling, partitioning data by user/project, caching, CDN delivery and video streaming, background work queues, and reproducible infrastructure. ‹src: Post-MVP-tasklist, MVP-tasklist-v1.1›

## Building with AI agents (creator's development method)

- **WD-IDEA-ALT-020** [voice] AI-assisted development method: investigate the current codebase first, then interview the creator to resolve contradictions and scope (full vs MVP) and surface missed adjacent problems. Only then write one self-contained planning doc per phase, marking open items as unresolved instead of guessing. ‹src: goated-prompts›
- **WD-IDEA-ALT-021** [voice] Specs written to drive AI implementation contain: problem statement, goals and non-goals, UX flow, data and state changes, key implementation notes, and open questions. ‹src: goated-prompts›
- **WD-IDEA-ALT-022** [voice] A reusable prompt library covers the full development lifecycle (onboarding, research, architecture, data model, API, tests, review, debugging, refactoring, integration, security, performance, docs, PR descriptions) as a structured way to direct AI coding agents. ‹src: goated-prompts›
- **WD-IDEA-ALT-023** [voice,future] Documentation "confidence rating": docs are marked as possibly outdated so agents verify against the actual code before editing. ‹src: truly strech›
- **WD-IDEA-ALT-024** [voice,future] A background agent that, after every work session, analyzes the edits made and auto-updates master docs (project overview, user flow, data model) to match the code. ‹src: truly strech›
