# Current Web App User Flow

Last reviewed from the current frontend codebase: May 10, 2026.

This document describes how the Aiuteur web app works today from a user's perspective. It is not a target-state product spec. It only covers user-facing behavior that is currently represented in the React app, including incomplete controls that currently show placeholder toasts.

## 1. App Entry, Authentication, and Global Navigation

### Public entry

When a visitor opens `/`, the app waits for auth initialization. While auth state is loading, the user sees a centered loading spinner.

If the user is not signed in, `/` renders the public landing page. If the user is already signed in, `/` redirects to `/dashboard`.

The public `/landing` route always shows the landing page. The `/auth` route shows the sign-in/sign-up screen.

### Authentication path

The auth form starts in sign-in mode unless another mode is passed in by the page. The user enters:

- Email
- Password

The app validates the email format and requires at least 6 password characters before submission. The password field has a show/hide button.

If the user makes a mistake:

- Invalid email shows `Please enter a valid email address`.
- Short password shows `Password must be at least 6 characters`.
- Failed sign-in/sign-up displays an error alert inside the form.
- Unexpected auth failures display `An unexpected error occurred`.

The user can switch between sign-in and sign-up with the link at the bottom of the form. Switching modes clears the current auth error.

Protected pages redirect unauthenticated users to `/auth` and preserve the attempted route in router state.

### Main layout

Once authenticated, the user sees the global sidebar around protected pages. The sidebar includes:

- Projects
- Style Capsule Library
- Asset Library
- Sign Out
- Theme toggle
- Collapse/expand control

Signing out returns the user to `/auth`.

## 2. Dashboard and Project Management

### Project list path

The dashboard loads the user's projects from the backend. While loading, the user sees a spinner and `Loading projects...`.

The dashboard includes:

- Search box
- Filter icon button
- Sort icon button
- New project card
- Existing project cards

The search box filters projects by title or description. If nothing matches, the dashboard shows `No projects found` and either tells the user to adjust the search or create the first project.

The filter and sort icon buttons are visible, but in the current UI they do not open any filter/sort controls.

If projects fail to load, the dashboard shows the error text, a destructive toast, and a `Try Again` button.

### Creating a new project

The user clicks the new project card. A dialog opens with one required field:

- Project Title

The submit button is disabled until the title has non-whitespace text. If the user somehow submits without a title, the app shows a destructive toast: `Project title is required`.

On success:

- The app creates the project with the title only.
- A success toast appears.
- The dialog closes.
- The form resets.
- The project list reloads.
- The user is routed into the new project.

On failure, a destructive toast shows the backend error message or `Failed to create project`.

### Opening or deleting a project

Clicking a project card opens `/projects/:projectId`.

Project cards show different progress summaries depending on whether scenes exist:

- Before production: the card shows current stage progress for Stage 1-5.
- After scenes exist: it shows `Narrative & Style Set`, current scene/stage status when available, and completed scene count.

When the user hovers a project card, a delete button appears. Clicking delete opens a confirmation dialog. If the user confirms, the app permanently deletes the project, shows a success toast, and reloads the list. If deletion fails, a destructive toast asks the user to try again.

## 3. Project Shell and Navigation Model

Inside a project, the top project header shows:

- Back button
- Project title
- Current branch
- Aspect ratio
- Artifact Vault button
- Story Timelines button
- New Branch button

The Artifact Vault, Story Timelines, and New Branch buttons currently show informational toasts:

- `Artifact Vault coming soon`
- `Story Timelines coming soon`
- `Branch creation coming soon`

The app persists the current project stage in both URL search params and localStorage. A user can refresh or reopen the project and usually return to the same stage. Stage 8 specifically requires a scene ID; if the app tries to restore Stage 8 without a scene ID, it redirects back to Stage 7.

The workflow is split into:

- Phase A: project-wide stages 1-5.
- Phase B: Script Hub and scene-specific stages 6-12.

Phase A uses the horizontal timeline. Users can click stages that are not pending. Pending stages are not clickable. Once the user has reached Phase B, the Phase A timeline can show a `Script Hub` return button.

Locked and outdated stages are still viewable. Locked stages show a `LOCKED-IN` badge, an `Unlock & Edit` button, and a next button. Outdated stages show an `OUTDATED` badge and editing/relock controls when provided.

## 4. Phase A: Global Project Flow

Phase A establishes the project-wide story, script, style, and master assets.

### Stage 1: Input

The user configures the project foundation.

The user chooses one input mode:

- Expansion
- Condensation
- Transformation
- Script Skip

For Expansion, the user can type an idea directly and optionally expand a supporting-file upload area. Other modes show a file staging area.

The user also chooses or enters:

- Project type: Narrative Short Film, Commercial / Trailer, or Video for Audio
- Aspect ratio: 16:9 or 9:16
- Target length slider
- Content rating
- Genre/tone tags
- Tonal precision text
- Optional writing style capsule

The `Continue to Treatment` button is disabled until the required conditions are met:

- Input mode selected
- Project type selected
- Tonal precision has at least 10 characters
- Either at least one uploaded file exists, or Expansion has at least 20 characters of idea text

If the user makes a mistake:

- Too-short idea text keeps the button disabled.
- Too-short tonal precision keeps the button disabled and shows the character count.
- Missing mode/project type keeps the button disabled.
- If internal validation fails on submit, the app logs validation errors but does not currently show a dedicated validation toast from this handler.

On completion, the app updates project configuration, processes the input, saves Stage 1 state as draft, cancels pending autosaves, and then locks Stage 1 through the project shell. The user advances to Stage 2.

### Stage 2: Treatment

Stage 2 generates treatment variations from the processed Stage 1 input.

On first load, if no variations exist, the app tries to generate initial treatments. While generating, the user sees a loading state. If no treatments exist and generation is not running, the user sees `No Treatments Generated` and a `Generate Treatments` button.

The user can:

- Switch among generated treatment versions.
- Read the active treatment.
- Toggle edit mode.
- Edit the treatment manually.
- Save manual changes.
- Select text and use `Edit Selection`.
- Generate one replacement or three alternatives for a selected section.
- Full regenerate all treatments with guidance.
- Generate a new variation.
- Approve and continue.

If the user makes a mistake:

- Full regeneration requires at least 10 characters of guidance; otherwise the app shows `Please provide at least 10 characters of guidance`.
- If no processed input exists, regeneration shows `No input data available for regeneration`.
- If initial generation cannot find Stage 1 processed input, generation fails and the user sees `Failed to generate treatments. Please try again.`
- If the user has unsaved edits and tries to switch treatment versions, the browser confirm dialog asks `You have unsaved changes. Switch anyway?`

Approving Stage 2 locks it and advances to Stage 3.

### Stage 3: Beat Sheet

Stage 3 generates and edits structural beats from the selected treatment.

On first load, if no beats exist, the app generates a beat sheet from Stage 2. If no beats exist and generation is not active, the user sees `No Beat Sheet Generated` and a `Generate Beat Sheet` button.

The user can:

- Drag beats to reorder them.
- Click a beat to edit its text.
- Expand original treatment context where available.
- Add a beat after an existing beat.
- Delete a beat.
- Brainstorm alternatives for a beat.
- Select an alternative to replace the original beat.
- Regenerate the full beat sheet with guidance.
- Confirm and lock.

If the user makes a mistake:

- Deleting down to fewer than 3 beats is blocked with `Minimum 3 beats required`.
- Confirming with any beat under 10 characters shows `All beats must have at least 10 characters`.
- Confirming with fewer than 3 beats shows `At least 3 beats are required`.
- Full regeneration requires at least 10 characters of guidance.
- If there is no treatment source, full regeneration shows `No treatment source available for regeneration`.

Confirming locks Stage 3 and advances to Stage 4.

### Stage 4: Master Script

Stage 4 generates and edits the screenplay from the beat sheet.

The script editor uses screenplay-aware TipTap extensions and a screenplay toolbar. A beat alignment side panel shows Stage 3 beats and can be collapsed.

On first load, the app loads Stage 3 beats, Stage 2 processed input, and project configuration. If there is no existing script, it attempts to generate one automatically once dependencies are ready. If the user lands before generation, the screen can show a ready state with a `Generate Master Script` button.

The user can:

- Edit the screenplay directly.
- Use the screenplay toolbar.
- Preview extracted scenes.
- Regenerate the full script with guidance.
- Select text and edit the selected section.
- Generate one replacement or three alternatives for the selected section.
- Click beats in the side panel to scroll/align with script context.
- Approve the script.

If the user makes a mistake:

- Previewing an empty script shows `Cannot preview scenes from an empty script`.
- Previewing a script without scene headings shows a warning: `No scenes found in script. Make sure your script includes scene headings (INT./EXT.).`
- Full regeneration requires at least 10 characters of guidance.
- Section editing requires at least 10 characters of guidance.
- Approving an empty script shows `Cannot approve an empty script`.
- Approving a script with no extracted scenes shows `No scenes found in script. Please add scene headings (INT./EXT.) before approving.`
- Approving scenes with no content shows that the empty scenes need content.

If Phase B work already exists, approving/re-extracting can show a downstream impact warning. The warning explains that scene IDs may change, deleted scenes may become `continuity_broken`, and downstream work may be affected. The user can cancel or proceed anyway.

Approving extracts scenes into the production flow, locks Stage 4, and advances to Stage 5.

### Stage 5: Assets

Stage 5 handles global visual style and project-level assets.

The user first locks a visual style. They can select a visual style capsule or enter a manual visual tone. Once visual style is locked, asset extraction and visual key generation become available.

The user can:

- Lock visual style.
- Change visual style, with a warning path that either marks images outdated or clears images.
- Extract assets from the script.
- Review extracted asset candidates.
- Confirm selected assets.
- Manually add assets.
- Upload images for assets.
- Generate images for assets.
- Generate all missing asset images.
- Edit visual descriptions.
- Delete, defer, restore, or retype assets.
- Promote an asset to the global library.
- Clone an asset into the project.
- Merge selected assets.
- Split an asset by scene variant.
- Open angle variants for an asset.
- Open location views for location assets.
- Lock all assets and continue to Script Hub.

If the user makes a mistake:

- Extracting before visual style is locked shows `Please lock a visual style first`.
- Locking a manual visual tone without choosing a preset or entering text shows `Please select a preset or enter a custom tone description`.
- If extraction finds no assets, the app warns that no assets were found and the user can add assets manually.
- If Stage 4 is incomplete, extraction reports that Stage 4 must be completed before extracting assets.
- Uploading an unsupported image type shows `Invalid file type. Only PNG, JPEG, and WebP are allowed.`
- Uploading a file over 10MB shows `File size exceeds 10MB limit.`
- Promoting an asset without a generated image is blocked.
- Locking Stage 5 requires a selected visual style, at least one active asset, and image keys for all active assets.

When Stage 5 locks successfully, the app moves to Stage 6, the Script Hub.

## 5. Phase B: Script Hub and Scene Selection

Stage 6 is the Script Hub. It is the entry point into scene-specific production.

The hub loads scenes extracted from Stage 4. It periodically refreshes scene status. If loading scenes fails, the user sees a destructive toast. If there are no scenes, the hub shows `No scenes found. Extract scenes from Stage 4 to get started.`

The user can:

- Select a scene.
- Enter the scene pipeline.
- Enter a specific stage for a scene when stage status supports it.
- Defer a scene.
- Restore a deferred scene.
- Review a scene video when available.
- Go back to Stage 5.

When the user enters a scene, the app fetches that scene's stage locks and resumes at the first scene stage that is not locked or outdated. If all scene stages are locked/outdated, it resumes at Stage 12. If lock fetching fails, it falls back to Stage 7.

The right scene workflow sidebar appears in scene mode. It includes:

- Back to Script Hub
- Stage 7 Shot List
- Stage 8 Visuals
- Stage 9 Prompts
- Stage 10 Frames
- Stage 11 Review
- Stage 12 Video

Stages are reachable only if they are current, completed, locked/outdated, or all prior scene stages are complete. Future unreachable stages appear disabled with lock styling.

## 6. Scene Pipeline

### Stage 7: Shot List

Stage 7 creates and edits shots for a single scene.

If no shots exist, the app attempts to auto-extract them. The UI then presents a shot list and a selected-shot detail editor.

The user can:

- Select shots.
- Edit shot action, dialogue, foreground/background characters, setting, camera, duration, and related metadata.
- Split a shot.
- Merge shots.
- Delete a shot.
- Assign a location asset manually.
- Clear a linked location.
- Resolve location links automatically.
- Save pending shot edits automatically after debounce.
- Lock the shot list.
- Unlock and edit an already locked/outdated shot list.
- Relock an outdated shot list.

If the user makes a mistake:

- If shots fail to load, the screen shows the error and a reload button.
- If no shots are available, the screen shows `No shots available`.
- Deleting the last shot opens a dialog; the user can cancel or defer the scene and return to the Script Hub.
- Duration below 1 second or above 30 seconds is an error.
- Duration below 4 seconds or above 12 seconds is a warning.
- Missing action, setting, or camera are errors.
- Very short or very long total scene duration is a warning.
- Missing linked locations for location assets can appear as warnings.

When the user tries to lock the shot list, local validation runs first. If errors or warnings exist, the validation modal appears:

- Errors must be fixed before proceeding.
- Warnings can be fixed or the user can proceed anyway.

If backend validation rejects the shot list, the app displays the returned errors/warnings and reports how many issues must be fixed.

Locking Stage 7 advances to Stage 8.

### Stage 8: Visual Definition

Stage 8 defines scene-level visual references for the assets used in the scene.

The app works with scene asset instances. Assets can be inherited from prior scenes, created from project assets, detected from shot dependencies, or added manually.

The user can:

- Initialize shot-asset assignments.
- Inherit assets from the prior scene.
- Detect and populate assets from script dependencies.
- Run AI asset detection.
- Bulk infer scene context.
- Apply accepted bulk context updates.
- Select assets for bulk image generation.
- Generate individual scene asset images.
- Bulk generate selected images after a cost confirmation dialog.
- Edit scene asset descriptions and tags.
- Create a new asset and add it to the scene.
- Add an existing project asset to the scene.
- Remove an asset from the scene after confirmation.
- Convert an asset into a transformation.
- Add and complete transformation events.
- Review location coverage.
- Proceed to prompts.

If the user makes a mistake:

- Proceeding with any scene asset missing a visual reference is blocked with a message telling the user how many assets need images.
- Proceeding with unconfirmed transformations is blocked.
- Proceeding with incomplete transformations is blocked.
- Bulk generation opens a cost confirmation dialog; canceling closes it without starting generation.
- Removing an asset opens a confirmation dialog because the scene-specific instance will be removed while the global/project asset remains.
- Failed image generation, detection, inference, or bulk update actions show destructive/error toasts.

Locking Stage 8 advances to Stage 9.

### Stage 9: Prompt Segmentation

Stage 9 creates frame and video prompts for each shot.

The app loads shot assignments, a continuity preview, and any existing prompts. If no shots are found, it shows `No Shots Found` and a `Back to Shot List` button.

The user can:

- Generate all prompts.
- Regenerate all prompts.
- Regenerate prompts for a single shot.
- Edit frame prompts.
- Edit video prompts.
- Generate continuity prompt text when available.
- Review shot asset timelines and continuity preview.
- Return to Stage 8 for repairs.
- Lock and proceed to frames.

If the user makes a mistake:

- If prompts fail to load and none are available, the app shows the error and a retry button.
- Empty prompt fields show `No prompts`.
- Prompt length can reach warning or error states based on configured frame/video prompt limits.
- If prompt generation partially fails, the toast reports how many generated and how many failed.
- The user can go back to Stage 8 with `Back to Visuals` or repair from continuity-related controls.

Completing Stage 9 advances to Stage 10.

### Stage 10: Frame Generation

Stage 10 generates and approves visual frames for each prompted shot.

The app loads shots with prompts and their frame data. If loading fails, it shows the error and a `Try Again` button. If no prompted shots exist, it shows `No shots with prompts found. Generate prompts in Stage 9 first.` and a `Back to Prompts` button.

The user can:

- Generate all needed frames.
- Generate frames for one shot.
- Generate start frames only.
- Generate end frames.
- Toggle whether a shot needs an end frame.
- Generate or regenerate dedicated end frame prompts.
- Edit frame/video prompt text.
- Approve frames.
- Compare frames.
- Inpaint a frame with a mask and prompt.
- Choose reusable continuity base frames.
- Review continuity links.
- Proceed only when frame approval requirements are met.

If the user makes a mistake:

- Proceeding is disabled until all frames are approved.
- Proceeding is also disabled when strict continuity checks are blocking.
- If there are no reusable base frames, the chooser shows `No reusable base frames yet.`
- If no continuity links exist for a shot, the continuity summary says `No continuity links`.
- Failed frame generation or prompt generation actions surface as toasts/errors from their mutations.

Completing Stage 10 advances to Stage 11.

### Stage 11: Confirmation

Stage 11 is the checkout/review step before video rendering.

The app fetches checkout data for the scene. While loading, it shows a spinner. If checkout data cannot be fetched, it shows the error and a `Try Again` button.

The user reviews:

- Shot cards
- Frame status
- Prompt status
- Warnings such as unapproved frames
- Prior-scene mismatch warnings
- Render model variant/cost information

The user can expand shot details and go back to frames.

If the user makes a mistake:

- If there are unapproved frames, the review highlights that frames are not yet approved.
- The confirm action is blocked or warned based on checkout readiness.
- Failed render queueing shows `Failed to queue render` or the returned error message.

When the user confirms, the app queues video jobs. On success, it shows how many jobs were queued and advances to Stage 12.

### Stage 12: Video Generation

Stage 12 tracks render jobs and provides video playback/review.

The app polls video jobs. If jobs cannot be fetched, it shows the error and a `Try Again` button. If no jobs exist, it shows `No Video Jobs`, explains that no video generation jobs were queued for the scene, and provides `Back to Confirmation`.

The user can:

- Watch playable shots in a video player.
- Play/pause.
- Seek through the timeline.
- Select shots from the shot list.
- Skip back and forward.
- Mute/unmute.
- Enter fullscreen.
- Retry failed jobs.
- Complete the scene.
- Export/review available outputs through the Stage 12 sections.
- Return to prior stages when issue-resolution controls request it.

If the user makes a mistake:

- Retrying a failed job can fail and display a destructive toast.
- Completing with all successful jobs shows `Scene rendering complete!`.
- Completing with failed jobs shows a warning but still completes the scene.
- When all rendering finishes, the app shows either a success toast or a warning if some jobs failed.

Completing Stage 12 exits the scene and returns the user to the Script Hub.

## 7. Locked, Outdated, and Backtracking Behavior

### Normal backtracking

Users can move backward with the stage header back buttons:

- Stage 2 back goes to Stage 1.
- Stage 3 back goes to Stage 2.
- Stage 4 back goes to Stage 3.
- Stage 5 back goes to Stage 4.
- Stage 6 back goes to Stage 5.
- Scene Stage 7 back exits to Script Hub.
- Scene stages 8-12 back to the previous scene stage.

The project header back button uses the provided back handler or browser history depending on context.

### Unlocking Phase A stages

If the user unlocks a locked Phase A stage, the app asks the backend for downstream impact.

If there is downstream impact, an unlock warning dialog appears. Confirming unlock:

- Marks the selected stage active.
- Marks downstream locked stages as outdated.
- Navigates the user to the unlocked stage.
- Shows `Stage N unlocked for editing`.

If unlock fails, the app shows `Failed to unlock stage`.

### Unlocking scene stages

Scene stages use the scene stage lock system. Unlocking a locked/outdated scene stage may show an impact warning. Confirming unlock lets the user edit that stage again. Downstream scene work can be marked outdated according to backend lock logic.

### Returning after a mistake

A common correction path today looks like this:

1. The user reaches Stage 9 and notices an asset continuity issue.
2. The Stage 9 continuity UI offers repair/back controls.
3. The user returns to Stage 8.
4. Stage 8 lets them adjust scene assets, regenerate missing scene visuals, or fix transformations.
5. The user proceeds again to Stage 9 and regenerates prompts as needed.

Another common correction path:

1. The user reaches Stage 10 but cannot proceed because not all frames are approved.
2. The continue button is disabled.
3. The user selects the unapproved shot, regenerates or edits frames, approves each frame, then proceeds.

Another correction path:

1. The user locks Stage 4 and starts scene work.
2. They later unlock Stage 4 to edit the master script.
3. The app warns that downstream scene IDs and scene work may be affected.
4. If the user proceeds, scene extraction attempts to preserve stable scene IDs where possible, while removed scenes may become `continuity_broken`.

## 8. Style Capsule Library Flow

The Style Capsule Library is available from the global sidebar.

The user can:

- Search capsules.
- Filter by type.
- Filter by all/presets/custom.
- Switch grid/list view.
- Switch between Writing Styles and Visual Styles tabs.
- Create writing or visual capsules.
- View preset capsules.
- Edit custom capsules.
- Duplicate preset capsules.
- Favorite/unfavorite capsules.
- Delete custom capsules after confirmation.

If loading capsules fails, the app shows a destructive toast. If a search/filter has no results, the tab shows an empty state telling the user to adjust search or filters.

Preset capsules are read-only in the edit dialog. The user must duplicate a preset to customize it.

## 9. Asset Library Flow

The Asset Library is available from the global sidebar.

The user can:

- Search global assets by name.
- Switch grid/list view.
- Filter by tabs: All, Characters, Props, Locations.
- Create a new asset.
- Edit an asset.
- Delete an asset after confirmation.

If global assets fail to load, the app shows a destructive toast. Create/edit/delete actions reload the library and show success toasts when they succeed.

Project assets from Stage 5 can also be promoted into this global library when they have generated images.

## 10. Current Placeholder or Incomplete User-Facing Controls

These controls are visible but do not currently perform their final intended feature:

- Dashboard filter icon: no active filter panel in the current dashboard component.
- Dashboard sort icon: no active sort menu in the current dashboard component.
- Project header Artifact Vault: shows `Artifact Vault coming soon`.
- Project header Story Timelines: shows `Story Timelines coming soon`.
- Project header New Branch: shows `Branch creation coming soon`.
- Branching is referenced in the Stage 4 downstream warning as future functionality.

## 11. Persistence and Recovery Behavior

The app preserves project workflow position using URL search params and localStorage:

- `stage` is written to the URL.
- Scene stages include `sceneId` when available.
- The last stage and scene ID are mirrored in localStorage.
- A flag records whether the project has reached Phase B so Phase A can show a return-to-Script-Hub affordance.

On reload, the app restores from the URL first, then localStorage. It validates Phase A stage access against stage states from the backend. If a restored Phase A stage is pending or invalid, the app redirects to the highest allowed non-pending stage.

For scene stages, the app fetches real scene lock state on restore and rebuilds completed stage status from the backend instead of assuming every prior stage is complete.

## 12. End-to-End Example Paths

### Path A: New user creates a project and reaches production

1. User signs in.
2. User lands on the dashboard.
3. User creates a project with a title.
4. User selects Expansion in Stage 1, writes an idea, sets project type, aspect ratio, length, rating, genre, tone, and optional writing style.
5. User continues to Stage 2.
6. App generates treatment variations.
7. User edits one treatment section and approves it.
8. App generates a beat sheet in Stage 3.
9. User reorders beats, adds one beat, and locks the beat sheet.
10. App generates the master script in Stage 4.
11. User previews extracted scenes and approves the script.
12. User locks visual style, extracts assets, generates visual keys, and locks Stage 5.
13. User enters Script Hub.
14. User opens Scene 1 and proceeds through shots, visuals, prompts, frames, checkout, and video rendering.
15. Scene completion returns the user to Script Hub.

### Path B: User catches a script mistake after production started

1. User reaches Script Hub and starts scene work.
2. User realizes the master script has a scene-heading or content issue.
3. User returns to Phase A through project navigation.
4. User unlocks Stage 4.
5. App shows a downstream warning if scene work already exists.
6. User confirms, edits the script, previews scenes, and approves again.
7. App attempts to preserve scene IDs, marks removed scenes as continuity-broken where applicable, and downstream stages may become outdated.
8. User returns to Script Hub and repairs affected scene stages.

### Path C: User cannot proceed from Stage 8

1. User enters a scene and completes the shot list.
2. Stage 8 shows scene assets.
3. User tries to continue before every required asset has a visual reference.
4. App blocks progress and reports how many assets are missing images.
5. User selects missing assets and bulk generates images through the cost confirmation dialog.
6. Some images fail, so the app reports partial failure.
7. User regenerates failed assets individually.
8. Once all scene asset visuals and transformations are complete, Stage 8 proceeds.

### Path D: User cannot proceed from Stage 10

1. User generates prompts in Stage 9 and enters Stage 10.
2. User generates frames but forgets to approve one.
3. The Stage 10 proceed button remains disabled.
4. User selects the shot, compares/regenerates/inpaints if needed, then approves the frame.
5. When all frames are approved and no strict continuity block remains, the user can proceed to Stage 11.

### Path E: User fixes validation errors in Stage 7

1. User edits a shot list and clears a camera field by mistake.
2. User clicks lock.
3. Validation modal appears with an error for the missing camera.
4. User chooses `Fix Issues`.
5. The user edits the selected shot's camera field.
6. User locks again.
7. If only warnings remain, the user can go back and fix them or proceed anyway.

