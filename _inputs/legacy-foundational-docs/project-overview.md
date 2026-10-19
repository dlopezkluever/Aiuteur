# **Product Requirements Document (PRD)**

## **Narrative-to-AI-Film Pipeline Web Application**

**Version:** 4.0 (Definitive Technical Specification)

**Document Status:** Approved for Engineering \- HIGH PRIORITY

**Core Architecture:** 12-Stage "Global-to-Local" Pipeline with Full Iterative Control

## **Table of Contents**

1. **Executive Summary & Core Utility** \* 1.1 Core Value Proposition  
   * 1.2 Core Problem & Solution (The Inversion)  
2. **System Architecture & Data Strategy** \* 2.1 Context Management Strategy (Global vs. Local)
   * 2.2 Style Capsule System (Written and Visual Styles)
   * 2.3 Stateful Asset Management (Inheritance Logic)
   * 2.4 Asset Extraction & Dependency Management (Single Extraction System)  
3. **Phase A: The Global Narrative & Style Engine (Stages 1–5)**  
   * 3.1 Stage 1: Input Modes & Style Capsule Initialization  
   * 3.2 Stage 2: Treatment Generation (Iterative Prose)  
   * 3.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)  
   * 3.4 Stage 4: The Descriptive Master Script (Finalized Narrative)  
   * 3.5 Stage 5: Global Asset Definition & Style Lock   
4. **Phase B: The Production Engine (Stages 6–12)**  
   * 4.1 Stage 6: The "Script Hub" & Scene Cycle  
   * 4.2 Stage 7: The Technical Shot List (Granular Breakdown & Control)  
   * 4.3 Stage 8: Visual & Character Definition (Asset Assembly)  
   * 4.4 Stage 9: Prompt Segmentation (The Merger and Formatting)  
   * 4.5 Stage 10: Frame Generation (The Anchors & Continuity)  
   * 4.6 Stage 11: Confirmation & Gatekeeping (The Credit Check)  
   * 4.7 Stage 12: Video Generation, Review & Iteration Loop  
5. **UI/UX Functional Requirements (COMPREHENSIVE)** \* 5.1 Global Application Navigation  
   * 5.2 The In-Project UI (Pipeline Workflow)  
   * 5.3 Context & Feedback Tools (Rearview Mirror & Guidance)  
6. **Technical Constraints & API Requirements** \* 6.1 API Integration Requirements (Veo3, Nano Banana)  
   * 6.2 Latency and Context Window Management  
   * 6.3 Data Persistence and Version Control (Corrected)  
7. **Versioning and Invalidation Logic (GIT-STYLE BRANCHING)** \* 7.1 Core Branching Philosophy  
   * 7.2 Mandatory & Optional Branching Rules  
   * 7.3 The Invalidation Rules (The Cost of Change)  
   * 7.4 The Artifact Vault (In-Project Repository)  
8. **Phase A: UI/UX & Agentic Tooling Definitions (Stages 1-5)** \* 8.1 Stage 1  
   * 8.2 Stage 2  
   * 8.3 Stage 3  
   * 8.4 Stage 4  
   * 8.5 Stage 5  
9. **Phase B: UI/UX & Agentic Tooling Definitions (Stages 6-12)** \* 9.1 Stage 6  
   * 9.2 Stage 7  
   * 9.3 Stage 8  
   * 9.4 Stage 9  
   * 9.5 Stage 10  
   * 9.6 Stage 11  
   * 9.7 Stage 12  
10. **Project Wrap & Export**
11. **Additional Considerations**
12. **Stretch Goals**


## **1\. Executive Summary & Core Utility**

### **1.1 Core Value Proposition**

The web application automates the transformation of written narratives into AI-generated short films through a strictly deterministic, cost-efficient, multi-stage workflow.

**Primary Utility:** **Story Consolidation and Management.** The largest engineering effort must be focused on the stability and iterative control of the narrative structure and visual style (Stages 1-5). The generation of video (Stages 10-12) is a result of the deterministic process, not the product's core feature.

**Target User:** Independent filmmakers, content creators, and marketing teams needing high-quality, stylistically consistent video prototypes or final products quickly and affordably.

### **1.2 Core Problem & Solution (The Inversion)**

**Problem:** Current AI video generation tools are non-deterministic, expensive, and fail at narrative continuity (inconsistent characters, jump cuts, scene-to-scene drift). They operate like a "slot machine" where the user pays for high-volume, low-quality options.

**Solution (The Inversion):**

1. **Plan:** The story is locked using the Beat Sheet (Stage 3).  
2. **Anchor:** The visual boundaries (Start Frame / End Frame) of every 8-second shot are locked using a cheaper image model (Stage 10).  
3. **Generate:** Expensive video compute (Veo3) is used only once, to generate the bridge content between two approved anchor frames. This process guarantees deterministic consistency and cost optimization.

## **2\. System Architecture & Data Strategy**

### **2.1 Context Management Strategy (Global vs. Local)**

To prevent Large Language Model (LLM) hallucinations, token limit overflows, and generation drift, the system must strictly divide data into two context scopes, managed by a Context Manager Service:

| Context Type | Data Contained | LLM Access | Purpose |
| ----- | ----- | ----- | ----- |
| **Global Context** | Beat Sheet, Project Summary, Master Character Descriptions, Style Capsule Selections. | Always (Phase A & B) | Maintains plot cohesion and stylistic tone across the entire project. |
| **Local Context** | Current Scene Script (Just the scene, extracted from stage 4), Current Shot List (Stage 7), **Previous Scene End-State** (Assets, Final Frame). | Only during the active Scene's lifecycle (Phase B). | Prevents token overflow; ensures continuity between Scene N and Scene N+1. |

### **2.2 Style Capsule System (Written and Visual Styles)**

The application must allow users to create and utilize Style Capsules to guide creative output in a deterministic, transparent manner.

* **Writing Style Capsules:**
  * **Structure:** User- or system-defined stylistic reference packages containing example text excerpts, optional labels, negative constraints, and high-level descriptors (e.g., "minimalist," "ornate," "detached").
  * **Storage:** Plain text + metadata, injected directly into system prompts.
  * **Application:** Used in Stages 1, 2, 3, 4, 7 and 9 to dictate tone, vocabulary, dialogue delivery, and descriptive style through explicit style imitation rather than similarity search.

* **Visual Style Capsules / Style Anchors:**
  * **Structure:** Descriptor strings, structured Design Pillars (Color Palette, Mood, Medium, Lighting, Camera Language), reference image URLs, or locked example frames.
  * **Storage:** Plain text descriptors + metadata, with optional reference images.
  * **Application:** Used in Stages 5, 8, and 10 to ensure visual output adheres to selected design pillars and reference imagery through explicit adherence rather than vector similarity.

### **2.3 Stateful Asset Management (Inheritance Logic)**

Assets (Characters, Props, Wardrobe) must retain their state across scenes to ensure visual consistency.

1. **Master Asset Definition:** In Scene 1, the user defines the **Master Asset** (e.g., "John Doe, 30s, clean shirt").  
2. **Inheritance Rule:** When moving to **Scene N+1**, the system defaults to the **final state** of the asset from **Scene N**.  
3. **Stateful Editing:** In Stage 8, the user can modify the inherited asset for the *current* scene only (e.g., add mud to the coat, change hairstyle). This saves a new instance: "John Doe (Scene N+1 \- Muddy)." 
4. **Status Metadata Tags:** Assets include a metadata layer for "Conditions" (e.g., "Wet," "Bloody," "Torn Wardrobe"). These tags are generated in Phase B based on shot outcomes and can be toggled to persist across scene boundaries. 
5. **Database Storage:** The system must track and store these scene-specific asset instances, which are automatically pulled into the Local Context for the current scene.

### **2.4 Asset Extraction & Dependency Management (Single Extraction System)**

To maximize efficiency and eliminate redundant AI calls, the system implements a revolutionary single-extraction approach that creates a comprehensive asset manifest at Stage 5, eliminating the need for repeated extraction at subsequent stages.

#### **Single Comprehensive Extraction (Stage 5)**

**Trigger:** Upon completion of Stage 4 (Master Script).
**Process:** One LLM call parses the entire Master Script to extract both Master Assets AND scene-level mappings.
**Output:** Complete asset manifest with scene dependencies.

**Data Generated:**
1. **Master Assets:** All unique characters, props, and locations with full descriptions
2. **Scene-Level Mapping:** Which assets appear in which scenes
3. **Dependency Population:** Automatic population of `scenes.dependencies` JSONB field

#### **Database Schema Integration**

**`scenes.dependencies` Structure:**
```json
{
  "characters": ["protagonist", "antagonist", "sidekick"],
  "locations": ["kitchen", "forest clearing"],
  "props": ["magic sword", "ancient book"],
  "extractedAt": "2026-02-04T10:30:00Z"
}
```

**Simultaneous Population Strategy:**
- `project_assets` table populated with Master Assets
- `scenes.dependencies` field populated with scene-specific mappings
- Asset-to-scene relationships established deterministically

#### **Efficiency Gains**

**Eliminated Redundant Extractions:**
- **Stage 6 (Script Hub):** Queries `scenes.dependencies` instead of extracting
- **Stage 8 (Visual Definition):** Uses cached dependencies for auto-suggestions instead of AI relevance detection
- **Phase B Operations:** All scene-based workflows reference pre-extracted data

**Manual Addition Support:**
- Users can still manually add assets in Stage 5 or Stage 8
- Manual additions don't trigger full re-extraction
- System maintains backward compatibility with existing workflows

#### **Cache Invalidation Strategy**

**Invalidation Triggers:**
- Stage 4 Master Script modifications
- Mandatory branching operations (Section 7.2)
- User-initiated "Re-extract Assets" action

**Invalidation Process:**
1. Detect Master Script changes
2. Regenerate complete asset manifest
3. Update all scene dependencies
4. Preserve manually-added assets where possible
5. Flag downstream stages for review

#### **Data Flow Architecture**

```
Master Script (Stage 4)
    ↓ [Single LLM Call]
Asset Manifest Creation
    ↓ [Parallel Population]
project_assets ←→ scenes.dependencies
    ↓ [Cached Access]
Stage 6/8 Workflows (No Re-extraction)
```

This approach transforms asset management from a distributed, repetitive process into a centralized, deterministic system that respects the principle of Stage 4 as the "Global Narrative Truth."

## **3\. Phase A: The Global Narrative Engine (Linear Flow)**

Note: Advanced detail for UI & Agentic Toolage & Iterative Design for each stage in Section 8

### **3.1 Stage 1: Input Modes & Style Capsule Initialization**

The user **MUST** select one of the four modes to initialize the narrative pipeline. The chosen mode defines the initial state of the story structure.

| Mode | User Input | AI Action | Purpose |
| ----- | ----- | ----- | ----- |
| **A: Expansion** | 1–3 Paragraphs (Idea Kernel) | Expands to a full 3-Act treatment. | Ideation and Blank Page Solution. |
| **B: Condensation** | Large Text Upload (100+ pages) | Summarizes and trims to a core cinematic narrative. | Adaptation and Token Optimization. |
| **C: Transformation** | Source Text \+ "Twist" Parameter | Rewrites narrative based on style parameters (e.g., "Hamlet in Space"). | Stylistic Adaptation and Parody. |
| **D: Script Skip** | Formatted Screenplay Upload | Parses directly into the Stage 4 Master Script format. | Streamlining for prepared users. |

### **3.2 Stage 2: Treatment Generation (Iterative Prose)**

**Input:** Processed text from Stage 1 \+ Selected Writing Style Capsule. **Output:** High-level, continuous prose story treatment (not yet segmented into scenes or beats).

**Iterative and Interactive Requirements:**

* **Variation Selection:** AI generates **3 distinct prose treatments** (e.g., different tones, different endings, differing chronology). The user must select one to proceed.  
* **Targeted Regeneration:** The user can **highlight any sentence or paragraph (or multiple paragraphs)** in the active treatment and right-click to trigger a context-specific regeneration.  
  * *Prompt:* "Make this sentence less formal." or "Inject more conflict into this section."  
  * The system uses the surrounding text as context to rewrite only the highlighted section.  
* **Manual Editability:** The treatment must be fully editable via a rich text editor interface. Any manual edits immediately override the AI's generated text and are locked for the next stage.  
* **Full Regeneration:** Requires input in the "Regeneration Guidance" box (Section 5.3).

### **3.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)**

**Input:** Locked Treatment from Stage 2\. **Output:** A numbered list of "Beats" (major plot points that define the narrative skeleton).

**Iterative and Interactive Requirements:**

* **Atomization:** AI breaks the treatment into 15-30 discrete narrative beats.  
* **Drag-and-Drop Reordering:** Users must be able to visually reorder beats to experiment with chronology. Moving a beat instantly updates its position and number.  
* **Beat Editing:** Each beat must be an editable text field.  
* **AI Brainstorm/Expansion:** A button associated with each beat must allow the user to explore alternatives.  
  * *Example:* "Brainstorm 3 alternative resolutions for Beat 10."  
  * *Example:* "Expand Beat 5 into two more detailed sub-beats."  
* **Targeted Regeneration, Manual Editability, Full Regeneration;** Similar to Stage 2, with use of  "Regeneration Guidance" box (Section 5.3).  
* **Gatekeeper:** The system **MUST** prevent progress to Stage 4 until the Beat Sheet is confirmed. This is the **most critical structural lock** in the entire process.  
* **Decoupling Logic:** Once the Master Script (Stage 4\) has been generated and approved, subsequent manual edits to the **Master Script** **DO NOT** trigger an automatic retroactive edit or invalidation of the Beat Sheet. Instead, the Beat Sheet UI must display a non-blocking/ passive flag: **"Not Up-to-Date with Current Script."** (With a manual "Sync" button available when the user returns to beat sheet)

### **3.4 Stage 4: The Descriptive Master Script (Finalized Narrative)** 

**Input:** Locked Beat Sheet (Stage 3\) \+ Writing Style Capsule. **Output:** The fully formatted **Traditional Film Script** (Dialogue, Action Lines, Scene Headings) for the entire project.

**Functional Requirements:**

* **Vivid Visual Blueprint (NEW):** The LLM is explicitly instructed to maximize descriptive text regarding Characters, Settings, Props, Action, and other Mis-en-scène for explicit visual translation. The script must be a **visually verbose blueprint**, not a concise theatrical script.  
* **Consistency Check:** The AI must ensure all dialogue and action generated aligns with the emotional and structural goals of the Beats.  
* **Format Integrity:** The output must use industry-standard script format (ALL CAPS for Scene Headings, Character Names, and SFX).  
* **Purpose:** This script serves as the **Global Narrative Truth**. It defines *what* happens in the entire film and is the source document for **Stage 6**.  
* **Final Approval:** User clicks "Approve Master Script." This document is frozen and serves as the single source of truth for Phase B.  
* **Targeted Regeneration, Manual Editability, Full Regeneration;** Similar functionality to Stage 2 & 3, with use of  "Regeneration Guidance" box (Section 5.3).  
* **Branching Trigger:** If the user initiates a **Regeneration of the Master Script** from an edited Beat Sheet, the **Mandatory Branching Rule** (Section 7.2) is triggered.

### **3.5 Stage 5: Global Asset Definition & Style Lock**

**Input:** Locked Master Script (Stage 4). **Output:** A set of finalized **Master Assets** (Visual Keys), locked **Visual Style Capsule / Style Anchor**, and populated scene dependencies.

**Functional Requirements:**

* **Single Comprehensive Asset Extraction:** The system uses ONE LLM call to parse the entire Stage 4 script and extract:
  - All unique **Key Characters**, **Key Props**, and **Key Settings** with full descriptions
  - **Scene-level mapping** showing which assets appear in which specific scenes
  - Simultaneous population of `project_assets` table AND `scenes.dependencies` JSONB fields
  - This eliminates redundant extraction calls in subsequent stages (6, 8)
* **Visual Style Lock:** The user selects the definitive **Visual Style Capsule / Style Anchor** (e.g., "Neo-Noir," "Pixar Animation"). This choice is locked as a **Global Context Constraint** for all subsequent image/video generation calls.
* **Image Key Generation with Transparent Background Enforcement:** For each extracted asset, the user guides the Gemini API to generate a definitive **Master Asset Visual Key (Image)**:
  - **Characters & Props:** Automatically inject "isolated on transparent background" into generation prompts
  - **Locations:** Generate with environmental context (no transparent background)
  - Post-processing background removal applied to characters/props if needed
* **Manual Asset Addition:** Users can manually add assets not detected by extraction, which are stored separately and don't trigger re-extraction
* **Gatekeeper:** All extracted **Master Assets** must have a locked **Image Key** before the user can proceed.

## **4\. Phase B: The Production Engine (Scene-by-Scene Cycle) (Stages 6-12)**

Note: Advanced detail for UI & Agentic Toolage & Iterative Design for each stage in Section 9

### **4.1 Stage 6: The "Script Hub" & Scene Cycle**

* **Hub UI:** A visual list of all scenes in the Master Script (Stage 4).
* **Status Indicators:** Each scene must display its current status (Draft, Shot List Ready, Frames Locked, Video Complete, **Outdated/Continuity Broken**).
* **Scene Dependency Display:** Each scene shows its asset dependencies (characters, locations, props) as populated by Stage 5's comprehensive extraction, eliminating the need for real-time asset detection.
* **Workflow:** The user selects a scene, completes the subsequent stages (**7-12**), and is returned to the Hub.
* **Dependency Queries:** Stage 6 queries pre-populated `scenes.dependencies` data instead of extracting scene information, providing instant scene context without LLM calls.

### **4.2 Stage 7: The Technical Shot List (Granular Breakdown & Control)**

**Input:** Master Script for the active scene \+ Local Context (Previous Scene End-State). **Output:** The scene broken down into a tabular list of 8-second shots. This is the **most critical control point for the video production**.

**Data Fields (Per 8-Second Shot \- MANDATORY):**

1. **Shot ID:** (e.g., 3A, 3B, 3C)  
2. **Dialogue:** Exact lines spoken in this 8s segment.  
3. **Action:** Specific physical movements (e.g., "John stands up, knocking the chair over").  
4. **Characters:** Who is visible and their prominence (e.g., "John (Foreground, Profile), Mary (Background, blurry)").  
5. **Setting:** Specific background details and lighting (e.g., "Kitchen counter, single bare lightbulb").  
6. **Camera:** Technical specifications (e.g., "Close Up (CU)," "Dolly In (Slow)," "High Angle").

**Iterative and Interactive Requirements:**

* **Shot Splitting/Merging:** User must be able to select a shot and click "Split," which uses the LLM to intelligently break the 8-second action into two new, coherent shots (e.g., 3B and 3C).  
* **Field Editing:** Every field in the table is directly editable by the user. Editing one field (e.g., changing "Wide Shot" to "Close Up") triggers a dynamic, near-instantaneous regeneration of the related **Dialogue/Action** fields to ensure coherence.  
* **Rearview Mirror Integration:** The **Rearview Mirror UI (Section 5.3)** must be visible here, displaying the final action/dialogue of the previous scene to ensure seamless hand-off.  
* **Gatekeeper:** User must lock the Shot List before proceeding to asset selection.

### **4.3 Stage 8: Visual & Character Definition (Asset Assembly)**

**Input:** Locked Shot List (Stage 7\) + Visual Style Capsule / Style Anchor + Scene Dependencies from Stage 5. **Output:** Scene-specific asset instances with visual keys and status tags.

**Functional Requirements:**

* **Dependency-Based Asset Auto-Suggestion:** Scene uses pre-populated `scenes.dependencies` from Stage 5's comprehensive extraction to instantly suggest relevant assets, eliminating the need for AI relevance detection.
* **"Use Master Asset As-Is" Checkbox:** Pre-selected checkbox allowing users to copy master asset images directly to scene instances without generation, providing instant progression for unchanged assets.
* **Historical Master Reference Carousel:** Master reference defaults to most recent scene instance image from previous scenes, with carousel navigation through:
  - Original Master Asset image
  - Scene 1 instance → Scene 2 instance → Scene 3 instance, etc.
  - Arrow controls for cycling through asset history
* **Generation Attempts Carousel:** When generating scene instance images, users can:
  - Generate multiple attempts for the same asset
  - View thumbnail carousel of all generation attempts
  - Select preferred attempt from history
  - Compare quality across multiple tries
* **Manual Image Upload:** Users can upload custom images for scene-specific assets, integrated into the generation attempts carousel system.
* **Asset Drawer Integration:** Enhanced **Asset Drawer UI (Section 5.3)** for adding new assets not detected by Stage 5 extraction.
* **Stateful Modification:** Dedicated text field for modifying inherited state, generating new **Scene Instance** descriptions with full audit trail.
* **Status Tags Management:** Visual condition tracking (muddy, bloody, torn, etc.) with carry-forward toggle for persistence across scenes.
* **Style Lock:** User confirms the **Visual Style Capsule / Style Anchor** selection for the scene, with automatic transparent background injection for characters/props.

### **4.4 Stage 9: Prompt Segmentation (The Merger and Formatting)**

**Input:** Shot List Data (Stage 7\) + Asset Data (Stage 8). **Output:** Separated, editable **Frame Prompts** and **Video Prompts** for each shot.

**Prompt Type Separation:**

* **Frame Prompts:** Visually descriptive, asset-heavy, spatially explicit prompts for start/end frame generation
  - References Stage 8 visual states and shot-level camera/blocking
  - Auto-generated by LLM but **read-only by default** with optional manual edit toggle
  - Used exclusively for image generation (Stage 10)
* **Video Prompts:** Action and audio-focused prompts for video generation
  - Dialogue, accents, timing, and sound effects fully specified
  - Minimal visual description (assumes anchor frames encode visual truth)
  - **Always editable** and auto-generated by LLM
  - Used exclusively for video generation (Stage 12)
* **System Scaffolding Prompts:** Internal orchestration logic (not shown to users)
  - Hidden from user interface
  - Encodes intent and dependency rules for model coordination

**Veo3 Prompt Formatting Requirements (MANDATORY):**

The video prompt structure must adhere to Veo3's preferred format:

* **Visual Section:** `[Camera]`
   $$Character$$$$Action$$
  . [Style Capsule / Style Anchor injection - explicit design pillars and reference imagery adherence]
* **Audio Section:** `Audio: [SFX Cues]. Character [Name] speaks: "[Dialogue Line]"`

**User Interface Requirements:**

* **Shot-Based Prompt Inspector:** Expandable cards per shot showing both prompt types
* **Prompt Validation:** Length validation, forbidden character checking, preview component
* **Full User Editability:** Both Frame and Video prompts auto-generated but fully editable by users
* **Model Compatibility Tags:** Indicate start-frame-only vs start+end-frame requirements

### **4.5 Stage 10: Frame Generation (The Anchors & Continuity)**

**Input:** Final Frame Prompts (Stage 9\) + Rearview Mirror Data (Previous Scene's End Frame). **Tool:** Google Gemini API (Flash-1 model). **Process:** Generates start/end anchor frames per 8-second shot using real image generation service.

1. **Start Frame Generation:** Must use the Prompt AND the previous shot's End Frame (from the Rearview Mirror) as a visual seed/reference to ensure continuity. (Though the shot maybe totally different than the last clip)  
2. **End Frame Generation:** Uses the Prompt and predicts the visual outcome 8 seconds later.
(*Note: Some AI Gen systems don't require an End Frame, so as mention in Section 9, there must be a way to switch to only needing the starting frame.*)

**Critical Continuity Requirements:**

* **Rearview Mirror (Visual):** The UI must prominently display the **Final Frame** of the prior shot for visual comparison against the new **Start Frame**.  
* **Inpainting/Region Editing:** If the Start Frame does not match the prior End Frame, the user can select a region (e.g., the character's face) and use a localized text prompt (e.g., "Change expression from surprise to neutral") to fix the continuity break without regenerating the entire image.  
* **Iterative Refinement:** Full regeneration of a frame is possible but requires the "Regeneration Guidance" box (Section 5.3).

### **4.6 Stage 11: Confirmation & Gatekeeping (The Credit Check)**

**Function:** This stage serves as the final **economic gatekeeper** before the expensive Veo3 generation.

* **Display:** A "Checkout" review screen summarizing the scene:  
  * List of all shots (3A, 3B, 3C...).  
  * Image pair (Start Frame / End Frame) for each shot.  
  * Final synthesized prompt for each shot.  
  * Calculated **Total Credit Cost** for the scene's video generation.  
* **Action:** User clicks "Confirm & Render." This queues the job for Stage 10\. No further manual edits are possible past this point.

### **4.7 Stage 12: Video Generation, Review & Iteration Loop**

**Tool:** Google Veo3 API (Video \+ Audio generation). **Process:** Submits the confirmed Start Frame, End Frame, and formatted prompt to Veo3.

**Review and Error Handling:**

* **Video Playback:** User views the full scene, cut together from the individual 8-second clips.  
* **Issue Resolution:** The user can select one of three iterative paths:  
  1. **SUCCESS:** "Complete Scene." Returns to the Script Hub.  
  2. **VISUAL ISSUE (Minor):** "Return to Stage 8 (Frames)." Requires regeneration of the anchor frames, meaning the video will be re-queued and credits charged again.  
  3. **NARRATIVE/AUDIO ISSUE (Major):** "Return to Stage 7 (Shot List)." Requires deep structural changes, potentially leading to a cascade of changes in Stages 8, 9, and 10\.

## **5\. Base UI/UX Functional Requirements** 

This section details the explicit structure and functionality of the application's user interface.

### **5.1 Global Application Navigation**

The system separates project work from global resource management.

* **The Projects Dashboard (Default Landing Page):** The user lands here immediately post-login. Project cards display the **Branch Status** and **Progress Meter**. A prominent **"+ New Project"** button initiates the workflow.  
* **The Global Sidebar (Persistent Navigation):** The left-hand sidebar provides persistent access to global data and configuration tools:
  1. **Home (Projects):** Returns to the Project Dashboard.
  2. **Style Capsule Library:** User-specific repository for creating, managing, and selecting Writing Style Capsules and Visual Style Capsules/Anchors. Includes preset capsules for common styles that can be duplicated and customized.
  3. **Asset Library:** Global repository for defining and managing **Master Assets** (Characters, Props, Locations) independent of any specific project. Note: Important Integration: The Asset Library now accepts "Promoted" assets from individual projects, making them available as templates for new projects.

### **5.2 The In-Project UI (Pipeline Workflow)**

Upon selecting a project, the view transitions to a dedicated workflow.

* **Phase A Timeline (Stages 1-4):** A persistent horizontal bar at the top of the screen visualizes the linear progression. Each node displays a status light (Grey: Unstarted, Green: Locked). The **Beat Sheet (Stage 3\)** node visibly displays the **"Not Up-to-Date" Flag** if Stage 4 has been edited manually.  
* **Project Header Control Panel (Top Right \- MANDATORY):** A critical set of three buttons must be prominently displayed in the top-right corner of the in-project screen:  
  1. **Artifact Vault** (Icon: Archive/Safe): Opens a comprehensive modal or sidebar view containing every generated asset (Scripts, Shot Lists, Frames, Videos, Prompts) associated with *this specific project*, organized by **Branch** and **Scene** (see Section 7.4). Note: Designated Assets can be "promoted" to the global "Asset Library" from this "Artifact Vault".
  2. **Version History** (Icon: Branching Tree): Opens the **Version History Modal** (see Section 7.4) displaying the visual tree of all branches and allowing users to load an alternative branch/version.  
  3. **Create New Branch** (Icon: Fork): A direct action button that instantly creates a new working branch off the current project state (see Section 7.2).  
* **The Script Hub (Scene Listing):** Occupies the left side of the Phase B workspace, listing scenes with their status (Complete, Outdated, In Progress).  
* **The Scene Workflow Sidebar (Stage 6-12):** A vertical navigation rail that appears when a scene is selected, allowing granular movement through the production stages for that specific scene.

### **5.3 Context & Feedback Tools**

These tools manage continuity and iteration.

* **The "Rearview Mirror" (Continuity Context UI):** A stateful, collapsible component positioned at the top of the viewport in Phase B stages (7-9). It dynamically displays the **End State** of the previous scene (Text in Stage 7; Final Frame in Stage 9\) to ensure continuity.  
* **The "Asset Drawer" (Inheritance and Management UI):** A dynamic right-hand sidebar component, active only in Stage 8, managing **Master Asset** inheritance and **Scene Instance** creation.  
* **Regeneration Guidance ("The Why" Box):** Any regeneration action (in Stages 2, 3, 4, 5, or 8\) **MUST** be blocked until the user provides a minimum of 10 characters of guidance. This text is saved as the **"Commit Message"** for that state.

## **6\. Technical Constraints & API Requirements**

### **6.1 API Integration Requirements (Veo3, Nano Banana)**

* **Nano Banana (Image Generation):** Must be used exclusively for the high-volume, low-cost frame anchoring (Start/End Frames in Stage 10). Must support region-based inpainting for continuity fixes.  
* **Google Veo3 (Video Generation):** Must be used exclusively for the final, high-cost video generation (Stage 12). Must support the input of two distinct anchor frames and a combined video/audio prompt string.

### **6.2 Latency and Context Window Management**

* **Target Latency:**  
  * Phase A (LLM Text Generation): \< 5 seconds per iteration/regeneration.  
  * Stage 10 (Nano Banana Frame Gen): \< 15 seconds per frame pair.  
  * Stage 12 (Veo3 Video Gen): Requires background processing with email/notification alerts on completion.  
* **Context Optimization:** All code must adhere to the **Global vs. Local Context** strategy (Section 2.1). No API call in Phase B should include the Master Scripts of non-active scenes.

### **6.3 Data Persistence and Version Control (Corrected)**

* **Real-time Saving:** The application must utilize Supabase Postgres (specifically JSONB columns) to save project state after every critical user action. This allows for flexible schema evolution for stage artifacts (Beat Sheets, Shot Lists) while maintaining relational integrity with the core Project and User tables.  
* **Branching System (Correction):** The old requirement for a fixed "5 previous states" is deprecated. All versioning will be managed by the **Git-Style Branching System** detailed in **Section 7**. This allows for non-linear, branching history persistence.

## **7\. Versioning and Invalidation Logic: "Story Timelines" (GIT-STYLE BRANCHING)**

This section details the formal rules governing the creation and management of project branches, ensuring stability and auditability. 

Use the term "Story Timelines" for this system.

### **7.1 Core Branching Philosophy**

The system differentiates between **Main** (the linear, approved timeline) and **Feature/Experimental** branches (alternate structural realities). This is crucial for isolating high-cost work (Stage 10 videos) from destructive, early-stage narrative pivots.

### **7.2 Mandatory & Optional Branching Rules**

| User Action | Branching Required? | System Behavior |
| ----- | ----- | ----- |
| **Regenerate Master Script (Stage 4\) from an Edited Beat Sheet (Stage 3\)** | **YES (Mandatory).** | The system automatically forces the creation of a new, named branch before regenerating the script on that new branch. This preserves the previous, completed timeline. |
| **Manual Edit to Beat Sheet (Stage 3\)** | **No.** | The edit is saved to the current branch. The Beat Sheet is flagged **"Not Up-to-Date with Current Script."** |
| **Manual Edit to Master Script (Stage 4\)** | **No (Optional).** | The user can make the edit on the current branch. However, the system prompts with a soft recommendation to **"Create New Branch"** if the edit is significant. |
| **Any Edit in Stages 5-12** | **No (Optional).** | Edits are saved to the current branch and trigger **Local Context Invalidation** (see 7.3). User can opt to branch via the **"Create New Branch"** button first. |

**Note:** *switching to a previous node always creates a New Fork, never overwriting existing data.* 
### **7.3 The Invalidation Rules (The Cost of Change)**

Invalidation flags artifacts as *Outdated* or *Continuity Broken* due to an upstream change.

* **Global Invalidation (High-Cost):**  
  * **Trigger:** Mandatory Branching (Script Regeneration from Edited Beats).  
  * **Scope:** All Phase B artifacts (Stages 5-10) on the *new branch* are marked as **Invalidated** and must be re-generated. The original branch remains untouched.  
* **Local Invalidation (Cascading Continuity Break):**  
  * **Trigger:** Manual editing of the Master Script (Stage 4\) or an edit in any Phase B stage (6-12) of **Scene N**.  
  * **Scope:** The final video for **Scene N** is marked *Outdated*. Furthermore, all subsequent scenes (N+1, N+2, etc.) on the *current branch* are marked **Outdated/Continuity Broken** due to the disruption of the "End Frame" anchor.  
  * **UX Requirement:** All local invalidation must trigger the **Cost & Dependency Warning Modal** prior to saving, encouraging the user to "lock in everything" before proceeding.

### **7.4 The Artifact Vault and Version History**

#### **A. The Artifact Vault (In-Project Repository)**

Accessed via the Project Header button, this is the central view for all generated assets within the current project.

* **Grouping:** All artifacts must be initially grouped by **Branch Name**, and then further grouped by **Stage** and **Scene ID**.  
* **Artifact Types:** Includes all generated Videos, Master Scripts, Shot Lists, Anchor Frames, and the Final Prompts.  
* **Metadata:** Every artifact listing must include its **Origin Branch**, **Creation Timestamp**, and associated **Credit Cost**.

**The "Promote to Global" Action:** Within the Artifact Vault, users can select any saved Scene Instance or Master Asset and click "Promote to Global". This action clones the asset, its Image Key, and its description into the Global Sidebar Asset Library for use in other project files.

#### **B. Version History Modal (The Timeline)**

Accessed via the Project Header button, this modal provides the visual management tool for the branching system.

* **Visualization:** A visual graph (tree-like structure) must be used to display the `Main` trunk and all diverging experimental branches.  
* **Node Information:** Each node (representing a saved state or branching point) displays the **Regeneration Guidance** text (the "Commit Message") and the timestamp.  
* **Actionable Switches:** Users can select any node and click **"Switch to this Version"** to instantly load that specific branch's state into the main editor workspace.

## **8\. UI/UX & Agentic Tooling Definitions (Stages 1–5)**

This section details the explicit structure, visible components, and agentic tooling for the initial stages of the pipeline.

## **8.1 Stage 1: Input Modes & Initialization**

The goal of this stage is to collect all *global, high-level parameters* that will define the subsequent narrative flow, before any text generation begins.

---

### **1\. Global Project Parameters (The Initial Setup)**

These parameters should be configured first and remain constant throughout the pipeline unless a new branch is created.

| Parameter | UI Component | System Logic/Purpose |
| :---- | :---- | :---- |
| **A. Target Length** | Dual-Input Slider or Two Input Boxes | User sets a desired video duration range (e.g., **3:00 to 5:00 minutes**). This value becomes the *Global Context* and informs the LLM in Stages 2/3 (Treatment/Beat Sheet) to adjust narrative density to fit the time constraint. |
| **B. Project Type** | Drag-and-Drop or Radio Buttons | User selects one of three categories: **Narrative Short Film**, **Commercial/Trailer**, or **Video Content for Audio** (Background visuals for a podcast, audiobook, etc.). This informs the narrative structure used in Stage 2/3 (e.g., "Narrative" uses the standard pipeline, a "Commercial" needs a high-impact structure, while "Video Content for Audio Content" is used for podcasts or audiobooks. While the full pipeline remains, the system strongly recommends an audio transcript upload. The Narrative Engine (Stages 2–4) uses this transcript to generate a visual "story" sans dialogue, focusing on matching action and visuals chronologically to the timestamped audio input). |
| **C. Content Rating** | Dropdown Menu (G, PG, PG-13, M-rated) | Sets the baseline constraints for LLM dialogue and action generation across all stages. |
| **D. Genre/Tone** | Multi-Select Dropdown | User selects primary genre(s) (e.g., Comedy, Thriller/Suspense, Drama, Romantic). |
| **E. Tonal Precision** | Dedicated Text Input Box (Mandatory 10 characters) | Allows for precise context/instruction for the selected content rating/genre (e.g., "Raunchy, with playful hints at taboo..."). This text is saved as a **Project Constraint Tag** in the Global Context. |

---

### **2\. Writing Style Capsule Selection**

Writing Style Capsules should be selected here as they influence the narrative generation in Phase A.

* **Style Capsule Selection:** The user selects a **Writing Style Capsule** (from system presets, their personal library, or creates a new one inline).
* **Optionality:** The selection should be clearly marked as **Optional**. If skipped, the AI defaults to a neutral, descriptive prose style.

---

### **3\. Input Modes & Multi-File Strategy**

The original four modes remain, but the input mechanism must be flexible to handle multiple files per your requirements.

| Mode | Core User Input | File Type Strategy | Revised AI Action |
| :---- | :---- | :---- | :---- |
| **A: Expansion** | 1–3 Paragraphs (Idea Kernel) | **Single Primary Input:** A core text box or single file upload. | Expands the core idea into a full 3-Act treatment. |
| **B: Condensation** | Large Text Upload (100+ pages) | **Single Primary Input:** Large file upload (e.g., a novel). | Summarizes and trims the text to a core cinematic narrative. |
| **C: Transformation** | Source Text \+ "Twist" Parameter | **Primary Input \+ Secondary Context Files (Optional):** Requires a Source Text upload. User may optionally upload secondary files (e.g., Parody Subject Material, research notes) to inform the "Twist." | Rewrites narrative based on style parameters. |
| **D: Script Skip (Revised)** | Formatted Screenplay Upload | **Primary Input (Mandatory) \+ Asset Definition Files (Optional):** Requires the main **Formatted Screenplay** file. User can optionally upload a **Character/Setting Definition Sheet** (structured data in a set format, e.g., JSON or a specific template) to pre-define assets for Stage 6, skipping the need for the LLM to infer these details. | Parses the screenplay directly into the **Stage 4 Master Script** format and, if provided, parses asset sheets into the **Master Asset Definition** library. |

#### **UI Solution for Multi-File Uploads (File Staging Area):**

Instead of a single "Upload" button, the UI should present a **File Staging Area** where users can drag and drop multiple files (regardless of the mode chosen).

1. **Primary Input Designation:** The user **must** designate one file as the **Primary Input** (e.g., the rough draft, the novel, the formatted script).  
2. **Context File Tagging:** All other uploaded files are designated as **Context Files** and the user tags them (e.g., "Character Notes," "World Building," "Parody Source," "Visual Reference Text").

The LLM is then instructed: "Use the **Primary Input** to generate the treatment, and use the **Context Files** for tone, detail, and supplementary information." This allows for maximum flexibility without forcing the user to adhere to a rigid file structure.

## **8.2 Stage 2: Treatment Generation (Iterative Prose)**

This stage focuses on free-form prose editing and dynamic alignment with the structural framework (Stage 3).

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Prose Editor** | Large, rich text editor with full manual editing capabilities. Must support **text highlighting** for targeted editing. | **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** Any text field is fully editable, instantly overriding the AI's output. **2\. Targeted Regeneration (Context Menu):** User highlights text and right-clicks to open a prompt box. The LLM uses the highlighted text and surrounding content to execute the edit. (examples: "Make this more raunchy and politically incorrect," or "Inject more conflict," but to be clear the user is to enter their own custom prompt input.) |
| **Consistency Flag** | A prominent, non-blocking flag (e.g., a yellow icon) in the header: **"Not Up-to-Date with Current Beat Sheet."** | **Dynamic Logic:** The flag appears if the user has manually edited the **Stage 3 Beat Sheet** *after* the Treatment was generated. The LLM monitors for this downstream change. |
| **Flag Resolution** | A dedicated button near the flag: **"Retroactively Revise Treatment."** | **Retroactive Revision Agent:** When clicked, the LLM uses the *current, approved Stage 3 Beat Sheet* as its source truth to regenerate the Stage 2 prose. This action is saved as a new version history state on the current branch and resolves the flag. **No new branch is created.** |
| **Full Regeneration** | **Regeneration Guidance Box** (The Why Box) is mandatory (min 10 characters). | **Full Regeneration Agent:** Triggers a complete rewrite of the Treatment prose based on the guidance box input. This creates a new version history state on the current branch. |
| **Variation Gallery** | Thumbnails/cards displaying the **3 distinct prose treatments** initially generated. | **Selection Control:** Allows the user to select an alternate version generated by the LLM as the active version, updating the current branch state. |

---

## **8.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)**

This stage is the structural editor, prioritizing speed and flexibility in structural manipulation.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Beat List Editor** | Takes up most of the page. A numbered, drag-and-drop list of editable text fields, each representing a "Beat." | **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** Every beat text field is fully editable. **2\. Targeted Regeneration:** User can highlight text within a single beat or select the entire beat item to trigger localized LLM changes via a context menu prompt (e.g., "Make this beat more dramatic"). **Drag-and-Drop Reordering:** Instantly updates beat numbers and position. |
| **Structural Tools** | Simple inline buttons (e.g., \+ and X) for each beat. | **Add/Remove Beats:** \* **Add:** Clicking \+ opens the **Regeneration Guidance Box** (The Why Box). The LLM uses the adjacent beats as context to generate the new beat based on the user's guidance. \* **Remove:** Simple deletion; the LLM uses the *next* beat as the continuity anchor. |
| **Beat Context View** | A button/icon on each beat list item that either expands the item or opens a Pop-Up Modal. | **Full Context Retrieval:** Displays the full, original continuous prose text segment from the **Stage 2 Treatment** that corresponds to that beat. This provides the user with the narrative context for editing the structural item. |
| **AI Brainstorm/ Expansion** | A dedicated inline button per beat (e.g., "Brainstorm"). | **Expansion Agent:** Opens a modal to generate alternatives or expand the beat: \* "Brainstorm 3 alternative resolutions for Beat X." \* "Expand Beat X into two more detailed sub-beats." |
| **Consistency Flag** | A non-blocking flag (e.g., a yellow icon) in the header: **"Not Up-to-Date with Current Script."** | **Dynamic Logic:** The flag appears if the user has manually edited the Stage 4 Master Script after the Beat Sheet was approved. |
| **Flag Resolution** | A dedicated button near the flag: **"Retroactively Revise Beat Sheet to Sync with Script."** | **Retroactive Revision Agent:** When clicked, the LLM uses the current, approved Stage 4 Master Script as its source truth to adjust the Stage 3 beat points and descriptions. This resolves the flag and updates the current branch's version history. **No new branch is created.** |
| **Forward Gatekeeper** | A prominent **"Confirm Beat Sheet & Proceed"** button. | **Structural Lock:** Prevents progress to Stage 4 until confirmed. Crucially, if the user attempts to Regenerate the Master Script (Stage 4\) from this newly edited Beat Sheet, the **Mandatory Branching Rule** is automatically triggered. |

## **8.4 Stage 4: The Descriptive Master Script** 

This stage is the definitive text source for all subsequent production stages.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Master Script Editor** | A rich text editor displaying the script in a conventional format (Scene Headers, Dialogue, Action, etc.). **Crucially, the LLM is explicitly instructed to generate verbose descriptions for visual elements (Characters, Setting, Props, Mis-en-scène).** | **Highlight-and-Rewrite Agent:** Same targeted regeneration tool as Stage 2\. User highlights action/description text and types a precise edit request (e.g., "Make sure the setting description includes the fact that the walls are peeling and green"). |
| **Beat Alignment Panel** | A persistent, read-only sidebar showing the Beats (Stage 3\) with the beat corresponding to the currently viewed script section highlighted. | **Passive Consistency Check:** This visual link ensures the user is aware of the structural anchor. The agent monitors for major structural deviations during manual edits that would flag the Stage 3 Beat Sheet (see Retroactive Revision in Stage 3). |
| **Consistency Flag** | A non-blocking flag (e.g., a yellow icon): **"Not Up-to-Date with Current Beat Sheet."** | **Dynamic Logic:** Appears if the user manually modifies the script in a way that breaks a Stage 3 Beat (e.g., deleting an entire plot point scene). This is resolved by returning to Stage 3 for the "Retroactively Revise Beat Sheet" action. |
| **Initial Generation Button** | **"Generate Descriptive Master Script"** button (for first pass). | **The Verbosity Engine:** Triggers the LLM to generate the script using the full context of the Stage 2 Treatment, adhering to the Stage 3 Beat Sheet, and prioritizing **vivid, explicit visual descriptions** for all components. |
| **Regeneration Guidance Box (Full)** | Mandatory "The Why" text area (min 10 characters) required for any **full script regeneration** (e.g., "Rewrite all dialogue to be more sarcastic"). | **Full Script Regeneration Agent:** Triggers the LLM to rewrite the entire script. This is considered a high-impact change because it breaks all subsequent (Phase B) stages. |
| **Gatekeeper & Branching** | A final approval button: **"Approve Master Script & Proceed to Asset Definition (Stage 5)."** | **Mandatory Branching Rule:** If the user attempts a full script regeneration after having made **manual edits to the Stage 3 Beat Sheet**, the system *must* auto-trigger the **Create New Branch** modal, forcing a fork in the project history before proceeding. **This is the main structural fork point**. |

---

## **8.5 Stage 5: Global Asset Definition & Style Lock** 

Stage purpose is to extract, visualize, and lock the global visual components based on the Stage 4 script.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Visual Style Capsule / Style Anchor Selection** | A prominent selector/dropdown at the top of the page. | **Style Lock:** User selects the **Visual Style Capsule / Style Anchor** (e.g., "Neo-Noir," "Pixar Animation," "Hyper-realistic VFX"). This selection is locked as a **Global Context Constraint** for all subsequent image/video generation calls (Nano Banana, Veo3). |
| **Asset Extraction & List** | A vertical list/sidebar initially auto-populated by the system. The list includes the names of all **Key Characters**, **Key Props**, and **Key Settings** extracted from the Stage 4 script. | **Extraction Agent:** LLM parses the entire Stage 4 script to deterministically extract and list every unique character, prop, and setting mentioned. |
| **Asset Definition Editor (Per Asset)** | Clicking an asset name opens a dedicated editor area. This area contains: **A. Descriptive Text Field** and **B. Image Key Generation.** | **Pre-Fill Agent:** The **Descriptive Text Field** is pre-filled with the *concatenated, cleaned* description of that asset as compiled from every mention in the Stage 4 Master Script. **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** The Descriptive Text Field is fully editable. **2\. Targeted Regeneration:** User can highlight any portion of the descriptive text to trigger localized LLM edits via a prompt box (e.g., "Change the character's eye color to green"). |
| **Image Key Generation** | A dedicated section with a "Generate Image Key" button and a viewport for the generated image. | **Nano Banana Agent (Initial Call):** This tool takes the user-edited **Descriptive Text** and the locked **Visual Style Capsule / Style Anchor** selection to call the Nano Banana API, generating the definitive **Master Asset Visual Key (Image)**. This image is stored in the Master Asset Library. |
| **Asset Iteration & Locking** | **Regeneration Guidance Box (Image Focus):** A text box for inputting changes (e.g., "Make the character's hair redder"). | **Image Generation Iteration:** The user can repeatedly adjust the descriptive text and regenerate the image key until satisfied. **Mandatory Action:** A **"Lock Master Asset"** button must be pressed to finalize the asset before proceeding to the next stage, triggering a new version history state. |
| **Gatekeeper** | A final approval button: **"Approve Master Assets & Proceed to Technical Shot List (Stage 6)."** | **Locking Mechanism:** All **Master Assets** (Characters, Props, Settings) must have a locked **Image Key** before the user can proceed. |
| **Voice Profile Assignment** (Stretch Goal) |	A dropdown or "Gallery" button within the Asset Editor. |	**Character Voice Seed:** (Stretch Goal 12.1) Allows the user to link a character to a specific voice profile (e.g., ElevenLabs ID). This metadata is passed to Stage 9 for inclusion in the Audio section of the Video Prompt. |

## **9\. Phase B:UI/UX & Agentic Tooling Definitions (Stages 6–12)**

This section defines the finalized user interface structure, interaction patterns, and agentic tooling for **Phase B: The Production Engine**, covering **Stages 6–12**. These stages are responsible for deterministic translation from a locked narrative and asset base into anchored frames and final video output, with explicit controls for cost, continuity, and iteration.

The guiding principle of Phase B is **controlled translation, not creative exploration**. Each stage answers exactly one question for the user, and all agentic tooling is strictly scoped to that question.

---

## **9.1 Stage 6: Script Hub & Scene Cycle**

### **Purpose**

Stage 6 serves as the navigation and risk-awareness layer for Phase B. It allows users to select scenes, understand their production status, and be informed of continuity or dependency risks without blocking progress.

### **UI/UX Definition**

**Primary Layout**

* **Scene Index (Persistent Left Panel):**  
  * Lists all scenes parsed from the Master Script.  
  * Each scene row displays:  
    * Scene number and short slug  
    * Status indicator: Draft, Shot List Locked, Frames Locked, Video Complete, or Outdated  
    * Thumbnail preview of the last approved end frame (or placeholder if unavailable)  
* **Scene Overview Panel (Main View):**  
  * Read-only excerpt of the scene header and opening action/dialogue  
  * “Scene Dependencies” summary showing:  
    * Expected characters at scene start  
    * Expected location  
    * Prior scene end-state summary  
* **Primary Actions:**  
  * Enter Scene Pipeline  
  * Jump to Upstream Scene  
  * Create New Branch

### **Outdated Scene Handling**

Scenes marked **Outdated** are not blocked. Instead, selecting them triggers a **non-blocking warning modal** explaining:

* Why the scene is outdated  
* Which upstream artifacts have changed  
* Which downstream scenes may be affected

Users may proceed after acknowledging the warning.

### **Agentic Tooling**

* **Continuity Risk Analyzer (Advisory):**  
  * Automatically evaluates continuity risk by comparing prior scene end-state metadata with the current scene’s opening requirements  
  * Outputs Safe, Risky, or Broken  
  * Displays warnings only; never edits or blocks

* **Condition Carry-Forward Prompt:** When a user enters a scene that follows a scene where "Status Metadata Tags" were applied (e.g., Scene N results in a "Muddy" tag), the Script Hub will trigger a mandatory prompt: "Carry forward 'Muddy' status for [Character Name] to Scene N+1?".
---

## **9.2 Stage 7: Technical Shot List**

### **Purpose**

Stage 7 defines the **exact mechanical breakdown** of the scene into discrete, time-bounded shots. It is the authoritative source for what happens in the scene, but not how assets look.

### **UI/UX Definition**

* **Rearview Mirror (Persistent Top Component):**  
  * Displays the final shot action/dialogue and final frame of the previous scene  
  * Used as continuity reference  
* **Shot Table (Primary Workspace):**  
  * Spreadsheet-style table where each row represents an 8-second shot  
  * Mandatory columns:  
    * Shot ID  
    * Duration  
    * Dialogue (verbatim)  
    * Action (atomic physical description)  
    * Characters (foreground/background tags)  
    * Setting  
    * Camera  
    * Continuity Flags  
* **Shot Inspector (Context Panel):**  
  * Expanded view of selected shot  
  * Displays beat reference and rationale

### **Agentic Tooling**

* **Shot Split / Merge Agent:**  
  * Splits or merges shots deterministically using user instruction  
  * Cannot invent new narrative content  
* **Field Coherence Agent:**  
  * When a single field is edited, regenerates dependent fields to preserve coherence  
* **Tempo Suggestion Agent (Optional):**  
  * Provides non-destructive pacing suggestions

---

## **9.3 Stage 8: Visual & Character Definition (Starting State)**

### **Purpose**

Stage 8 defines the **starting visual state** of all relevant characters, locations, and props at their first appearance in the scene.

### **UI/UX Definition**

**Scene Visual Elements Panel (Left):**

* Auto-populated list from Stage 5's `scenes.dependencies` (no real-time extraction)
* Grouped by Characters, Locations, Props
* Each element displays:
  * Source (Master Asset, Prior Scene Instance, or New Scene Asset)
  * Review status (Unreviewed, Edited, Locked)
  * Status tags with carry-forward indicators
  * Multi-select capability for bulk operations

**Visual State Editor (Center):**

* **"Use Master Asset As-Is" Checkbox:** Pre-selected checkbox for instant progression without generation
* **Historical Master Reference Carousel:** Arrow controls to cycle through:
  - Original Master Asset image
  - Previous scene instances chronologically
  - Visual indicators showing current selection
* **Generation Attempts Carousel:** When generating scene instance images:
  - Display thumbnails of all generation attempts
  - Metadata on hover (timestamp, cost, prompt used)
  - "Select This One" action to set active instance
  - Compare multiple attempts before selection
* **Manual Image Upload:** File upload component with format validation
* **Editable text description** representing the starting look
* **Status Tags Management:** Visual condition chips (muddy, bloody, torn) with carry-forward toggles

**Asset Drawer Trigger Panel (Right):**

* **"Add New Assets" Interface** (renamed from "Create Scene Asset")
* Global and project asset library toggle
* Supports:
  * Adding assets not detected by Stage 5 extraction
  * Creating new scene-only assets
  * Manual asset promotion to global library
  * Search and filtering within large asset libraries

### **Enhanced Generation Flow**

1. **Dependency Loading:** System loads pre-populated assets from Stage 5's scene dependencies
2. **User Selection:** User reviews assets, toggles "Use Master Asset As-Is" as needed
3. **Description Editing:** User modifies text descriptions for assets requiring customization
4. **Reference Selection:** User chooses master references via historical carousel
5. **Bulk Generation:** User multi-selects elements requiring image generation
6. **Generation & Comparison:** Multiple attempts generated, user selects preferred versions via carousel
7. **Status Tag Application:** Visual conditions applied with carry-forward settings

### **Enhanced Agentic Tooling**

* **Dependency Query Agent:** Retrieves cached asset dependencies (no extraction needed)
* **Historical Reference Manager:** Builds asset history chains across scenes
* **Text Edit Agent (Scoped):** Applies user-directed edits to highlighted text only
* **Multi-Attempt Generation Orchestrator:** Manages parallel generation with version tracking
* **Transparent Background Injector:** Automatically applies background isolation for characters/props

### **Constraints**

Stage 8 defines only the visual conditions at the start of a scene. Mid-scene visual changes are handled in Stage 10\.

---

## **9.4 Stage 9: Prompt Segmentation & Model Preparation**

### **Purpose**

Stage 9 deterministically assembles and exposes all prompts that will be sent to downstream models, separating them by function and model requirements.

### **Prompt Taxonomy**

Each shot produces a **Prompt Set** consisting of:

* **Frame Prompt(s):** Used for image generation (start frames &, if applicable, end frames)  
* **Video Prompt:** Used for video generation  
* **System Scaffold Prompt:** Hidden orchestration logic 

### **UI/UX Definition**

* **Shot-Based Prompt Inspector:** Expandable card per shot

**Frame Prompt Section:**

* Visually verbose  
* Includes asset references, spatial layout, camera, and starting state  
* Read-only by default with optional manual edit toggle

**Video Prompt Section:**

* Focused on action progression, dialogue, accents, SFX, and timing  
* Minimal visual description  
* Always editable

**Model Compatibility Tags:**

* Indicates whether the shot requires:  
  * Start frame only  
  * Start and end frames  
* Indicates compatible video models

### **Agentic Tooling**

* **Prompt Assembler Agent:** Deterministically creates prompt sets  
* **Prompt Sanity Checker:** Flags mismatches between prompt intent and model usage

---

## **9.5 Stage 10: Frame Generation (Anchors & Continuity)**

### **Purpose**

Stage 10 establishes visual truth by generating and validating anchor frames used for downstream video generation.

### **Mode Selection (Mandatory)**

Before generation, users select one of the following:

**Quick Mode (Speed-Optimized):**

* Bulk generates all required frames  
* Faster but potentially wasteful

**Control Mode (Cost-Optimized):**

* Sequential generation  
* Start frame must be approved before end frame generation  
* Ensures dependency correctness

**Optional Toggle:** Start-frame-only generation for models that do not require end frames

### **UI/UX Definition**

**Common Components:**

* Shot frame panel with status indicators  
* Visual rearview mirror with ghost and flicker comparison

**Quick Mode UI:**

* Grid-based generation view  
* Progress tracking  
* Bulk review and correction tools

**Control Mode UI:**

* Step-by-step shot progression  
* Explicit approve-before-advance workflow

### **Mid-Scene Visual Evolution**

End frame prompts incorporate:

* Action context  
* Prior frame reference  
* Descriptions of visual changes resulting from action

### **Agentic Tooling**

* **Frame Dependency Manager:** Enforces correct frame chaining  
* **Region-Level Inpainting Agent:** Allows localized corrections  
* **Continuity Drift Detector:** Flags visual inconsistencies

---

## **9.6 Stage 11: Confirmation & Gatekeeping**

### **Purpose**

Stage 11 provides a final economic and dependency review before video generation.

### **UI/UX Definition**

* Scene summary with all shots  
* Start/end frame previews  
* Prompt snapshots  
* Cost breakdown  
* Dependency warning if applicable

No agentic tooling is used in this stage.

---

## **9.7 Stage 12: Video Generation, Review & Iteration Loop**

### **Purpose**

Stage 12 generates the final video and routes the user back to the appropriate upstream stage if issues are detected.

### **UI/UX Definition**

* Timeline-based video player with shot markers  
* Issue classification controls:  
  * Visual continuity  
  * Timing  
  * Dialogue/audio  
  * Narrative structure
* **Render Re-Entry Logic** (Stretch Goal):
  * When a background render (defined in 12.2) is complete, clicking the notification or the "Complete" status in the Script Hub (Stage 6) must drop the user directly into the Stage 12 Review Player for that specific scene.

### **Agentic Tooling**

* **Failure Attribution Agent:** Maps issues to the most likely upstream stage

---

## **10\. Project Wrap & Export**

**Purpose:** To facilitate the transition from AI generation to professional post-production software.

**Export Formats:** The system must support a "Pro Export" package including:

* **Individual Clips:** All 8-second .mp4 files with high-bitrate encoding.

* **NLE XML/EDL:** An Edit Decision List (EDL) or XML file that allows for 1-click importing into DaVinci Resolve, Adobe Premiere Pro, or Capcut, maintaining the sequence order defined in the Script Hub.

* **Standardized Naming Convention:** All exported clips must follow the format: [ProjectName]_[Scene#]_[ShotID]_[Version#].mp4 (e.g., Aiuteur_Sc01_Shot3A_v02.mp4). This ensures the files remain organized when imported into DaVinci Resolve or Premiere.

* **Audio Stems:** Separate tracks for Dialogue, SFX, and Background Music (if generated) / OPTIONAL.

**Bulk Archive:** A single .zip download containing all final "Approved" artifacts from the active branch.

---

## **11\. Additional Considerations**

### **Canonical Prompt Type Separation (Hard Requirement)**

The system enforces three canonical prompt types. These prompt types serve different purposes, target different models, and must never be conflated or merged.

**Prompt Types**

* **Frame Prompt**  
   Used exclusively for image generation of starting and ending frames.  
   Characteristics:

  * Visually verbose

  * Asset-heavy

  * Spatially explicit

  * References Stage 8 visual states and shot-level camera/blocking

* **Video Prompt**  
   Used exclusively for video generation.  
   Characteristics:

  * Action- and audio-focused

  * Dialogue, accents, timing, and sound effects fully specified

  * Minimal visual description

  * Assumes visual appearance is already encoded in anchor frames

* **System Scaffold Prompt**  
   Used internally for orchestration and constraint enforcement.  
   Characteristics:

  * Never user-editable

  * Not visible in the UI

  * Encodes intent such as “this image is a video anchor frame” or dependency rules

This separation is foundational. Once locked, it enables Stage 9 to be deterministic and Stage 10 to remain flexible.

---

### **Prompt Verbosity Rules by Model Type**

Prompt verbosity must be aligned with downstream model requirements.

* Frame prompts must fully specify visual composition, spatial relationships, camera framing, and asset appearance.

* Video prompts must prioritize motion, dialogue, performance, and sound, and should avoid restating visual attributes unless required for action clarity.

* Video prompts should assume that starting frames already encode the visual truth.

The system should warn, but not block, when verbosity is misaligned.

---

### **User-Visible Prompt Clarity**

Users must always understand which prompt affects which output.

Stage 9 must clearly label:

* Which prompt affects image generation

* Which prompt affects video generation

* Which logic is system-owned and non-editable

This clarity is mandatory to avoid user confusion and incorrect edits.

---

### **Start-Frame-Only Compatibility (Sora-Style Models)**

The pipeline must support video generation models that require only a starting frame.

Requirements:

* Shots may be tagged as **Start-Frame-Only Compatible** in Stage 9\.

* When enabled:

  * End frame generation is skipped entirely.

  * Stage 10 UI hides end-frame requirements.

  * Frame dependency logic adapts accordingly.

* Stage 11 cost calculations must exclude end-frame generation for these shots.

This is a first-class pipeline path, not a workaround.

---

### **Generation Mode Enforcement (Speed vs Cost)**

Stage 10 must require an explicit generation mode selection before any frame generation occurs.

* **Quick Mode**  
   Bulk generation optimized for speed. Higher risk of wasted credits.

* **Control Mode**  
   Sequential, approval-based generation optimized for cost efficiency and continuity correctness.

Mode selection affects frame dependency handling and cost estimation downstream.

---

### **Mid-Scene Visual Change Handling (Non-Over-Specified)**

Visual evolution during a scene must not be pre-defined upstream.

Rules:

* Stage 8 defines only starting visual conditions.

* Stage 10 implicitly handles visual changes via:

  * Action context

  * Prior frame inheritance

* Frame prompts may reference visual changes only when generating subsequent frames.

* Over-specifying visual evolution upstream is explicitly discouraged.

This preserves flexibility and prevents brittle prompts.

---

### **Cost Awareness Propagation**

High-cost operations must always surface cost implications.

* Frame generation

* Regeneration

* Bulk operations

Stage 11 aggregates cost estimates based on:

* Generation mode

* Frame requirements per shot

* Start-frame-only vs start+end-frame paths

### **Prompt Responsibility Separation**

* Frame prompts define visual appearance  
* Video prompts define motion and audio  
* Visual verbosity is explicitly discouraged in video prompts

### **State Ownership**

* Stage 8 owns initial visual state  
* Stage 10 owns visual evolution  
* No other stage mutates asset appearance

### **Cost Discipline**

* All high-cost operations require explicit user confirmation  
* Control Mode is the default recommendation for cost-sensitive users

### **12\. Stretch Goals**

**12.1 Audio & Voice Consistency (Voice Gallery)**

* **The Gap:** Standard AI video audio can lack vocal character continuity across shots.  
* **Solution:** Integration of a **Voice Gallery** in Stage 5 (Global Assets). Users assign a specific voice profile (via ElevenLabs API or similar) to each Master Character. This profile acts as a "Voice Seed" for all Stage 12 Veo3 calls, ensuring "John Doe" sounds identical in every 8-second clip.

**12.2 Handling API Timeouts & Rendering Failures**

* **The Gap:** High-cost, high-latency video generation (Stage 12\) can lead to session timeouts or idle time.  
* **Solution: Asynchronous Notification Service.**  
  * **Background Rendering:** The UI must decouple the "Render" command from the user’s active session. Users can click "Confirm & Render" and then immediately return to the Script Hub to work on other scenes.  
  * **Notification System:** A progress bar will persist in the Global Sidebar. Upon completion or failure, the system sends an in-app toast notification and an email alert to the user.

