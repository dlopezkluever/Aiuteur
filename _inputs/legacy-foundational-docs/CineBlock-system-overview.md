# CineBlock — System Architecture & Integration Overview

> Comprehensive reference for development teams integrating CineBlock into a larger filmmaking application.

---

## Table of Contents

1. [What CineBlock Is](#1-what-cineblock-is)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [State Management](#5-state-management)
6. [Core Data Models & Types](#6-core-data-models--types)
7. [View System & Routing](#7-view-system--routing)
8. [World Generation Pipeline (Marble API)](#8-world-generation-pipeline-marble-api)
9. [3D Rendering Architecture](#9-3d-rendering-architecture)
10. [Mannequin & Asset System](#10-mannequin--asset-system)
11. [Lighting System](#11-lighting-system)
12. [Camera System](#12-camera-system)
13. [Capture Pipeline](#13-capture-pipeline)
14. [Export System](#14-export-system)
15. [Keyboard Shortcuts Reference](#15-keyboard-shortcuts-reference)
16. [Testing Architecture](#16-testing-architecture)
17. [Environment & Build](#17-environment--build)
18. [Integration Guidance](#18-integration-guidance)

---

## 1. What CineBlock Is

CineBlock is a **browser-based cinematic pre-visualization tool** ("previs"). It lets a filmmaker or director:

1. **Generate a 3D world** from reference photos, video, or a text prompt — powered by the World Labs Marble API (Gaussian splatting).
2. **Block out a scene** inside that world by placing articulated mannequin stand-ins for characters and primitive shapes for props.
3. **Light the scene** with positionable point and spot lights with physical color temperature controls.
4. **Frame and capture shots** using a virtual camera with viewfinder overlays, multiple aspect ratios, and a dutch-angle roll control.
5. **Export a shot package** — a ZIP of PNG frames (start/end per shot) plus JSON metadata describing the shot list, asset placements, and camera parameters.

The downstream consumer of this export is **Aiuteur**, a larger AI-driven filmmaking pipeline where CineBlock's JSON becomes the structured brief driving AI generation of final imagery.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐ │
│  │ SetupView│ → │  StudioView  │ → │  ResultsView    │ │
│  │          │   │              │   │                 │ │
│  │ Images   │   │ R3F Canvas   │   │ Hero selection  │ │
│  │ Assets   │   │  ├─ Splat    │   │ ZIP export      │ │
│  │ Shots    │   │  ├─ Collider │   │ JSON export     │ │
│  │          │   │  ├─ Mannequin│   │                 │ │
│  │ Generate │   │  └─ Lights   │   │                 │ │
│  └──────────┘   └──────────────┘   └─────────────────┘ │
│       │                 ▲                               │
│       │ REST            │ URLs                          │
│       ▼                 │                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │       CineBlockState (useReducer + Context)     │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │  World Labs Marble API  │
            │  api.worldlabs.ai       │
            │                         │
            │  → media-assets upload  │
            │  → worlds:generate      │
            │  → operations poll      │
            │  ← .spz (splat)         │
            │  ← .glb (collider mesh) │
            └─────────────────────────┘
```

**Data flow summary:**
- All application state lives in a single `CineBlockState` object managed by React's `useReducer`.
- `SetupView` populates the state with input images, assets, and shots, then calls the Marble API.
- When the world is ready, the app navigates to `StudioView` which consumes `spzUrl` and `colliderUrl` from state to load the 3D scene.
- All 3D interactions (mannequin placement, lighting, camera framing) produce state updates via dispatched actions.
- `ResultsView` reads `captures` from state to display and export the final deliverable.

---

## 3. Tech Stack

| Layer | Library | Version | Role |
|---|---|---|---|
| UI Framework | React | 19 | Component rendering, hooks |
| Language | TypeScript | 5.9 (strict) | Type safety |
| Build Tool | Vite | 6 | Dev server, bundling |
| Styling | Tailwind CSS | 4 | Utility-first CSS via Vite plugin |
| 3D Renderer | Three.js | 0.181.0 | WebGL scene graph |
| React–Three Bridge | @react-three/fiber | 9 | React renderer for Three.js |
| Three.js Utilities | @react-three/drei | 10 | CameraControls, TransformControls, useGLTF, Html overlay |
| Gaussian Splat Renderer | @sparkjsdev/spark | v2.0.0-preview | SparkRenderer + SplatMesh for .spz files |
| ZIP Creation | jszip | 3.10.1 | Building export ZIP in-browser |
| File Download | file-saver | 2.0.5 | Triggering browser download |
| Testing | vitest | 4.1.0 | Unit tests (node environment) |

**Notable constraints:**
- `@sparkjsdev/spark` is installed directly from GitHub (`github:sparkjsdev/spark#v2.0.0-preview`) — not from npm. This is a preview library and its API may change.
- Three.js is pinned to exactly `0.181.0` to match the R3F + Spark compatibility matrix.
- The Canvas is initialized with `preserveDrawingBuffer: true` — required for `toDataURL()` capture to work; comes at a small GPU memory cost.

---

## 4. Project Structure

```
CineBlock/
├── src/
│   ├── App.tsx                    # Root router (view switcher + breadcrumb nav)
│   ├── main.tsx                   # React entry point (createRoot + CineBlockProvider)
│   ├── store.tsx                  # useReducer + Context + all Action types + reducer
│   ├── types.ts                   # All shared TypeScript interfaces and constants
│   │
│   ├── components/
│   │   ├── ArticulatedMannequin.tsx   # Procedural skeleton mesh (reusable primitive)
│   │   ├── Lights.tsx                 # LightObject, LightGizmo, LightPlacementHelper
│   │   ├── Mannequins.tsx             # MannequinScene, PropMannequin, CharacterMannequin,
│   │   │                              #   MannequinGizmo, MannequinOverlay, PlacementRaycastHelper
│   │   ├── MarbleWorld.tsx            # GaussianSplat + ColliderMesh loaders
│   │   └── ProceduralAnimals.tsx      # ProceduralDog, ProceduralCat (multi-primitive meshes)
│   │
│   ├── services/
│   │   └── marbleApi.ts           # All Marble API calls + orchestration helpers
│   │
│   ├── utils/
│   │   ├── composeScenePrompt.ts  # Builds text prompt from shot list for hybrid generation
│   │   ├── kelvinToColor.ts       # Kelvin temperature → RGB hex (Tanner Helland algorithm)
│   │   └── surfaceClamp.ts        # Raycasts downward to compute foot-contact offset
│   │
│   ├── views/
│   │   ├── SetupView.tsx          # Input section — images, assets, shots, generation CTA
│   │   ├── StudioView.tsx         # 3D editor — canvas, sidebar, capture controls
│   │   └── ResultsView.tsx        # Review captures, select heroes, export ZIP/JSON
│   │
│   └── __tests__/                 # Vitest unit tests (reducer-level)
│
├── public/                        # Static assets served at root
├── dist/                          # Vite build output (git-ignored)
├── ._docs/                        # Developer documentation
│   ├── system-overview.md         # This file
│   ├── prd-revised.md             # Full product requirements document
│   ├── marble-api-reference.md    # Marble API endpoint reference
│   ├── dev-task-list.md           # Phase-by-phase build history
│   ├── phase-2-to-6-dev-info.md   # Implementation notes per phase
│   ├── world-gen-all-docs-edited.md # World generation feature specs
│   └── future-dev/                # Post-hackathon research notes
│
├── .env                           # VITE_MARBLE_API_KEY (not committed)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 5. State Management

### Pattern

CineBlock uses **React `useReducer` + React Context** — no Redux, no Zustand, no external store library.

```
CineBlockProvider
  ├── StateContext  (value = state)       → useCineBlockState()
  └── DispatchContext (value = dispatch)  → useCineBlockDispatch()
```

Both contexts are initialized in `src/store.tsx` and wrapped around the app in `src/main.tsx`.

### Accessing State

```typescript
import { useCineBlockState, useCineBlockDispatch } from './store';

function MyComponent() {
  const state = useCineBlockState();
  const dispatch = useCineBlockDispatch();

  // Read
  const shots = state.shots;

  // Write
  dispatch({ type: 'ADD_SHOT', id: crypto.randomUUID(), name: 'Shot 1' });
}
```

### Complete State Shape

```typescript
interface CineBlockState {
  // Navigation
  currentView: 'setup' | 'studio' | 'results';

  // Setup inputs
  locationImages: AzimuthSlot[];        // 4 directional image slots
  assets: CineBlockAsset[];             // characters & props
  shots: CineBlockShot[];               // ordered shot list
  aspectRatio: AspectRatioKey;          // '16:9' | '2.39:1' | '4:3' | '9:16'

  // World generation inputs
  inputMode: 'guided' | 'free' | 'text' | 'video' | 'single';
  freeImages: FreeImageSlot[];          // 2–8 images for free mode
  sceneDescription: string;            // text prompt (all modes)
  generationSettings: GenerationSettings;
  videoFile: VideoSlot | null;
  singleImage: SingleImageSlot | null;

  // World generation status
  worldId: string | null;
  worldStatus: 'idle' | 'uploading' | 'generating' | 'polling' | 'ready' | 'error';
  worldError: string | null;
  spzUrl: string | null;               // URL to .spz Gaussian splat file
  colliderUrl: string | null;          // URL to .glb collider mesh
  worldMarbleUrl: string | null;       // Link back to Marble editor

  // Studio editor state
  activeShotIndex: number;
  activeFrameType: 'start' | 'end';
  assetVisibility: Record<string, boolean>;   // assetId → visible
  mannequinPlacements: MannequinPlacement[];
  lightPlacements: LightPlacement[];
  sceneLighting: SceneLighting;
  lightingModeEnabled: boolean;
  captures: CaptureEntry[];
  rollAngle: number;                   // camera dutch angle in degrees
  mannequinOcclusion: boolean;         // depth test for mannequins vs splat
}
```

### All Dispatcher Actions

| Action Type | Key Payload Fields | Effect |
|---|---|---|
| `NAVIGATE` | `view` | Switch between setup / studio / results |
| `SET_AZIMUTH_SLOT` | `azimuth`, `file`, `previewUrl`, `dimensions?` | Load image into a directional slot |
| `CLEAR_AZIMUTH_SLOT` | `azimuth` | Remove image from slot |
| `ADD_ASSET` | `id`, `name`, `assetType`, `description`, `color` | Create character or prop |
| `REMOVE_ASSET` | `id` | Delete asset + cascade removes from shot.assetIds |
| `UPDATE_ASSET` | `id`, `field`, `value` | Edit any asset field |
| `ADD_SHOT` | `id`, `name` | Create new shot (defaults: Wide, 8s) |
| `REMOVE_SHOT` | `id` | Delete shot + cascade removes its light placements |
| `UPDATE_SHOT` | `id`, `field`, `value` | Edit any shot field |
| `SET_WORLD_STATUS` | `status`, `error?` | Update generation pipeline status |
| `SET_WORLD_DATA` | `worldId`, `spzUrl`, `colliderUrl`, `worldMarbleUrl?` | Store completed world URLs |
| `SET_ACTIVE_SHOT` | `index` | Switch shot; auto-clones lights to new shot if empty |
| `SET_FRAME_TYPE` | `frameType` | Switch between start/end frame |
| `TOGGLE_ASSET_VISIBILITY` | `assetId` | Toggle show/hide in studio |
| `SET_ASSET_VISIBILITY` | `visibility` | Bulk set visibility map |
| `ADD_MANNEQUIN` | `placement` | Spawn mannequin/prop in active shot |
| `UPDATE_MANNEQUIN` | `assetId`, `shotId`, `position?`, `rotation?`, `scale?` | Move/rotate/scale via gizmo |
| `UPDATE_MANNEQUIN_POSE` | `assetId`, `shotId`, `pose` | Set joint angles |
| `UPDATE_MANNEQUIN_BODY` | `assetId`, `shotId`, `bodyParams` | Set height / build |
| `REMOVE_MANNEQUIN` | `assetId`, `shotId` | Remove from scene |
| `ADD_CAPTURE` | `capture` | Store screenshot entry |
| `TOGGLE_HERO` | `captureId` | Mark as hero; clears other heroes for same shot+frameType |
| `SET_ASPECT_RATIO` | `aspectRatio` | Change viewfinder ratio |
| `SET_INPUT_MODE` | `mode` | Switch generation input tab |
| `ADD_FREE_IMAGE` | `id`, `file`, `previewUrl`, `dimensions?` | Add to free-mode image pool (max 8) |
| `REMOVE_FREE_IMAGE` | `id` | Remove from free-mode pool |
| `SET_SCENE_DESCRIPTION` | `description` | Update text prompt |
| `SET_GENERATION_SETTINGS` | `settings` | Partial update to model/resolution/seed |
| `SET_VIDEO_FILE` | `file`, `previewUrl`, `sizeBytes`, `format` | Set video input |
| `CLEAR_VIDEO_FILE` | — | Clear video input |
| `SET_SINGLE_IMAGE` | `file`, `previewUrl`, `dimensions?` | Set single image input |
| `CLEAR_SINGLE_IMAGE` | — | Clear single image input |
| `SET_ROLL_ANGLE` | `angle` | Set camera dutch angle (degrees) |
| `SET_MANNEQUIN_OCCLUSION` | `enabled` | Toggle depth testing for mannequins |
| `ADD_LIGHT` | `light` | Add light to active shot |
| `UPDATE_LIGHT` | `id`, `shotId`, `updates` | Edit any light property |
| `REMOVE_LIGHT` | `id`, `shotId` | Remove light from shot |
| `SET_SCENE_LIGHTING` | `lighting` | Update ambient/directional intensity |
| `SET_LIGHTING_MODE` | `enabled` | Toggle lighting edit mode |
| `RESET` | — | Return to `initialState` |

### Light Auto-Clone Behavior

When `SET_ACTIVE_SHOT` fires and the destination shot has **no existing lights**, the reducer automatically clones all lights from the previous shot (with new UUIDs) into the new shot. This ensures lighting continuity across the shot list without manual re-setup.

---

## 6. Core Data Models & Types

All types live in `src/types.ts`.

### AzimuthSlot

```typescript
interface AzimuthSlot {
  azimuth: 0 | 90 | 180 | 270;  // cardinal direction in degrees
  label: string;                 // 'Front' | 'Right' | 'Back' | 'Left'
  file: File | null;
  previewUrl: string | null;
  mediaAssetId: string | null;   // Marble API media_asset_id after upload
  dimensions?: ImageDimensions;  // { width, height } in pixels
}
```

### CineBlockAsset

```typescript
interface CineBlockAsset {
  id: string;                        // UUID
  name: string;                      // display name
  type: 'character' | 'prop';
  shape?: PropShape;                 // props only; undefined for characters
  description: string;               // text description
  color: string;                     // hex color for mannequin rendering
}

type PropShape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'plane' | 'capsule' | 'dog' | 'cat';
```

Default bounding box sizes (`PROP_SHAPE_DEFAULTS` — `[width, height, depth]`):
- `box` → `[1, 1, 1]`
- `cylinder` → `[0.8, 1.5, 0.8]`
- `sphere` → `[1, 1, 1]`
- `cone` → `[0.8, 1.5, 0.8]`
- `plane` → `[2.5, 0.05, 2.5]`
- `capsule` → `[0.5, 1.8, 0.5]`
- `dog` → `[1.2, 0.9, 0.6]`
- `cat` → `[0.9, 0.7, 0.5]`

### CineBlockShot

```typescript
interface CineBlockShot {
  id: string;
  name: string;                   // e.g. "A1", "INT. OFFICE - DAY"
  action: string;                 // action line / description
  cameraType: 'Wide' | 'Medium' | 'Close-Up' | 'OTS' | 'POV' | 'Two-Shot' | 'Insert';
  assetIds: string[];             // which assets appear in this shot
  duration: number;               // seconds, 1–30, default 8
  cameraDistance?: 'wide' | 'medium' | 'close';
  cameraHeight?: 'eye_level' | 'high_angle' | 'low_angle' | 'overhead' | 'ground_level';
  cameraMovement?: string;        // freeform text, e.g. "dolly in"
}
```

### MannequinPlacement

```typescript
interface MannequinPlacement {
  assetId: string;                // references CineBlockAsset.id
  shotId: string;                 // references CineBlockShot.id
  position: [number, number, number];   // Three.js world space (meters)
  rotation: [number, number, number];   // Euler XYZ (radians)
  scale: [number, number, number];
  pose?: MannequinPose;           // joint angles (characters only)
  bodyParams?: MannequinBodyParams;
}

interface MannequinPose {
  leftShoulder: [number, number, number];   // Euler XYZ
  leftElbow: number;                         // single-axis bend
  rightShoulder: [number, number, number];
  rightElbow: number;
  leftHip: [number, number, number];
  leftKnee: number;
  rightHip: [number, number, number];
  rightKnee: number;
}

interface MannequinBodyParams {
  height: number;   // meters, default 1.7
  build: number;    // scale multiplier, default 1.0
}
```

### LightPlacement

```typescript
interface LightPlacement {
  id: string;
  shotId: string;
  lightType: 'point' | 'spot';
  position: [number, number, number];
  rotation: [number, number, number];   // Euler XYZ (radians); direction for spot
  kelvin: number;                        // color temperature, e.g. 5500
  tintColor: string;                     // hex color overlaid on kelvin color
  intensity: number;                     // Three.js light intensity
  distance: number;                      // falloff radius in meters
  coneAngle: number;                     // radians; spot only (Math.PI/6 = 30°)
  penumbra: number;                      // 0–1 edge softness; spot only
}
```

Default light (`DEFAULT_LIGHT`): spot at `[0, 2, 0]`, aimed down (`rotation: [-π/2, 0, 0]`), 5500K, white tint, intensity 1.0, distance 10m, 30° cone, 0.5 penumbra.

### CaptureEntry

```typescript
interface CaptureEntry {
  id: string;
  shotId: string;
  frameType: 'start' | 'end';
  dataUrl: string;               // base64 PNG data URL
  isHero: boolean;               // true = primary hero frame for this shot+frameType
  capturedAt: string;            // ISO 8601 timestamp
  rollAngle: number;             // camera dutch angle at time of capture
}
```

### GenerationSettings

```typescript
interface GenerationSettings {
  model: 'Marble 0.1-mini' | 'Marble 0.1-plus';
  splatResolution: '100k' | '500k' | 'full_res';
  seed?: number;                 // 0–4,294,967,295; undefined = random
}
```

Model comparison:
| Model | Generation Time | Approximate Cost |
|---|---|---|
| Marble 0.1-mini | 30–45 seconds | ~$0.15 |
| Marble 0.1-plus | 5–10 minutes | ~$1.50 |

Splat resolution comparison:
| Resolution | Use Case |
|---|---|
| `100k` | Quick preview |
| `500k` | Default — balanced quality/performance |
| `full_res` | Highest fidelity, heavier to render |

---

## 7. View System & Routing

CineBlock has **three views** managed by `state.currentView`. There is no URL router — navigation is pure state.

```
App.tsx
  ├── currentView === 'setup'   → <SetupView />
  ├── currentView === 'studio'  → <StudioView />
  └── currentView === 'results' → <ResultsView />
```

Navigation is triggered by:
```typescript
dispatch({ type: 'NAVIGATE', view: 'studio' });
```

### SetupView (`src/views/SetupView.tsx`)

**Purpose:** Collect all inputs needed to generate a world and define the shot list.

**Sections:**
- **Section A — Location:** Input mode tabs (Guided / Free / Text / Video / Single Image) with corresponding upload zones.
  - **Guided mode:** 4 `AzimuthSlotCard` drop zones (Front=0°, Right=90°, Back=180°, Left=270°). Each slot shows a validation badge: green (≥1080p), yellow (≥720p), red (<720p).
  - **Free mode:** 2–8 images, arbitrary layout. API infers spatial arrangement automatically.
  - **Text mode:** Freeform scene description only.
  - **Video mode:** Single video file upload.
  - **Single image mode:** One reference image, optionally with panoramic flag.
- **Section B — Assets:** Inline-editable list. Each row: type toggle (character/prop), name input, color picker, shape selector (props only), description, delete button. Color auto-assigned from palette on creation.
- **Section C — Shots:** Collapsible `ShotCard` list. Each card: shot name, action line, camera type dropdown, asset checkbox list, optional camera distance/height/movement fields, duration slider.
- **Generation CTA:** Disabled until ≥2 images (guided/free) or description (text) plus ≥1 named shot. Button triggers the appropriate orchestrator from `marbleApi.ts` based on `inputMode`.

**Validation for CTA enablement:**
```typescript
const canGenerate =
  (inputMode === 'guided' && locationImages.filter(s => s.file).length >= 2) ||
  (inputMode === 'free' && freeImages.length >= 2) ||
  (inputMode === 'text' && sceneDescription.trim().length > 0) ||
  (inputMode === 'video' && videoFile !== null) ||
  (inputMode === 'single' && singleImage !== null);

const hasShots = shots.some(s => s.name.trim().length > 0);
const enabled = canGenerate && hasShots;
```

### StudioView (`src/views/StudioView.tsx`)

**Purpose:** 3D interactive editor for placing assets, framing shots, and capturing frames.

**Layout:**
- **Canvas** (fills remaining width): React Three Fiber `<Canvas>` with all 3D scene content.
- **Sidebar** (280px fixed right): Shot selector, frame type toggle (Start / End), asset list with place/remove controls, capture tray with thumbnails, lighting controls, global settings.

**Key interactive elements:**
- Viewfinder overlay (HTML div) with aspect-ratio letterboxing and optional grid lines.
- Capture button (or `Space`) takes a cropped screenshot of the viewfinder bounds.
- Placement mode: clicking canvas raycasts against the collider mesh to place mannequins/lights at the hit point.
- Gizmos (TransformControls) appear on selected mannequins/lights for translate/rotate/scale.

### ResultsView (`src/views/ResultsView.tsx`)

**Purpose:** Review captures, select hero frames, and export the deliverable.

**Features:**
- Shot cards showing start/end hero thumbnails with alternate capture thumbnails below.
- Star icon toggles hero status (1 hero per shot+frameType enforced by reducer).
- Lightbox viewer: click any thumbnail to enlarge; arrow-key and click navigation; Escape closes.
- **ZIP export:** Downloads `cineblock-export.zip` containing `shot-{name}-{frameType}/start-01.png` (etc.) for each capture.
- **JSON export:** Downloads `cineblock-export.json` with two root keys:
  - `cineblock`: human-readable shot list with asset placements and captures.
  - `aiuteur`: structured format for the downstream AI pipeline.

---

## 8. World Generation Pipeline (Marble API)

All API logic lives in `src/services/marbleApi.ts`.

### API Base & Auth

```
Base URL: https://api.worldlabs.ai
Auth Header: WLT-Api-Key: <VITE_MARBLE_API_KEY>
Content-Type: application/json (non-upload requests)
```

### Endpoints Used

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/marble/v1/media-assets:prepare_upload` | Get signed S3 upload URL |
| `PUT` | `{upload_url}` (S3) | Upload file bytes |
| `POST` | `/marble/v1/worlds:generate` | Initiate world generation |
| `GET` | `/marble/v1/operations/{operation_id}` | Poll operation status |
| `GET` | `/marble/v1/worlds/{world_id}` | Fetch world details (optional) |

### Generation Flow (all input modes)

```
1. prepareUpload(file, kind) → { media_asset_id, upload_url, required_headers }
2. PUT upload_url with file bytes + required_headers
3. worlds:generate with assembled world_prompt → { operation_id }
4. pollOperation(operation_id) every 5 seconds until done=true
5. response.assets.splats.spz_urls[splatResolution] → spzUrl
   response.assets.mesh.collider_mesh_url → colliderUrl
6. dispatch SET_WORLD_DATA → navigate to StudioView
```

### Input Mode → API Mapping

| `inputMode` | Orchestrator | `world_prompt.type` | Key Fields |
|---|---|---|---|
| `guided` | `uploadAndGenerate` | `multi-image` | `multi_image_prompt[].azimuth` (0/90/180/270) |
| `free` | `uploadAndGenerate` | `multi-image` | `reconstruct_images: true`, `azimuth: null` |
| `text` | `generateFromText` | `text` | `text_prompt` |
| `video` | `uploadVideoAndGenerate` | `video` | `video_prompt.media_asset_id` |
| `single` | `uploadImageAndGenerate` | `image` | `image_prompt.media_asset_id`, optional `is_pano` |

All image/video modes also accept an optional `text_prompt` alongside the visual input for hybrid generation.

### Polling Timeouts

| Model | Timeout |
|---|---|
| `Marble 0.1-mini` | 5 minutes |
| `Marble 0.1-plus` | 10 minutes |

### Orchestrator Callback Interface

```typescript
interface GenerationCallbacks {
  onUploading?: () => void;   // fired before S3 upload starts
  onGenerating?: () => void;  // fired after generate request sent
  onPolling?: () => void;     // fired when polling loop begins
  onSuccess?: (world: WorldResponse) => void;
  onError?: (error: string) => void;
}
```

These callbacks drive `worldStatus` state transitions in the UI. `SetupView` wires `dispatch(SET_WORLD_STATUS)` into each callback.

### WorldResponse Shape

```typescript
interface WorldResponse {
  world_id: string;
  display_name: string;
  world_marble_url: string;         // link to Marble editor
  assets: {
    splats: {
      spz_urls: Record<string, string>;  // keys: '100k', '500k', 'full_res'
      semantics_metadata?: {
        ground_plane_offset?: number;
        metric_scale_factor?: number;
      };
    };
    mesh: {
      collider_mesh_url: string;    // .glb for raycasting
    };
  };
}
```

---

## 9. 3D Rendering Architecture

### Canvas Setup

```typescript
// StudioView.tsx
<Canvas
  gl={{ antialias: false, preserveDrawingBuffer: true }}
  camera={{ fov: 60, near: 0.1, far: 1000 }}
>
  <SceneControls />           // CameraControls from drei + reset ref
  <CameraKeyboardDriver />    // WASD + Q/E translation
  <CameraRollDriver />        // Dutch angle via camera.up manipulation
  <MarbleWorld />             // Splat renderer + invisible collider mesh
  <LightScene />              // Global lights + per-shot light objects
  <MannequinScene />          // Characters & props for active shot
  <MannequinOverlay>          // Separate render pass for gizmos (always on top)
    <MannequinScene />
  </MannequinOverlay>
</Canvas>
```

`antialias: false` is intentional — performance tradeoff; the splat itself provides visual smoothness. `preserveDrawingBuffer: true` is required for `gl.domElement.toDataURL()`.

### MarbleWorld Component

**File:** `src/components/MarbleWorld.tsx`

Loads and renders two assets from Marble API output:

1. **Gaussian Splat** (`.spz` file)
   - Uses `SparkRenderer` (added to scene once) + `SplatMesh` from `@sparkjsdev/spark`.
   - The splat coordinate system uses computer-vision convention (Y-down, Z-forward). CineBlock applies a `Math.PI` rotation around Y to convert to Three.js convention (Y-up, Z-backward).
   - `SplatMesh` supports Level-of-Detail (LoD) — controlled by the `lod` prop on `SplatMesh`.

2. **Collider Mesh** (`.glb` file)
   - Loaded via `useGLTF` from drei.
   - Rendered with `visible={false}` — purely for raycasting, never displayed.
   - The full mesh is added to a raycaster target list in `MannequinScene` and `LightScene`.

**Camera Clone Patch:**  
SparkJS internally clones the Three.js camera for LoD calculations. The default `camera.clone()` fails on properties that cannot be serialized (event listeners, DOM refs). `MarbleWorld.tsx` monkey-patches `camera.clone` to skip those properties, preventing a runtime crash.

### MannequinOverlay (Portal Pattern)

**Problem:** Mannequin gizmos (TransformControls) render as Three.js objects and get occluded behind the Gaussian splat because splats render with a depth buffer.

**Solution:** A second scene + camera pair is created via React Three Fiber's `createPortal`. Gizmos are rendered in this overlay scene which draws on top of the main scene without depth testing against it. The `MannequinScene` is rendered twice — once in the main scene (for the actual mannequin mesh with depth testing), once in the overlay scene (for the gizmo handles on top).

### Rendering Order Summary

```
Frame render:
  1. Main scene:
     ├── Gaussian splat (depth buffer populated)
     ├── Collider mesh (invisible, depth buffer only)
     ├── Scene lights (AmbientLight, DirectionalLight)
     ├── Per-shot point/spot lights (actual light objects)
     └── Mannequin meshes (with depth testing vs splat)
  2. Overlay scene (draws on top):
     └── Mannequin gizmos (TransformControls)
```

---

## 10. Mannequin & Asset System

### Characters: ArticulatedMannequin

**File:** `src/components/ArticulatedMannequin.tsx`

A procedural skeleton built from Three.js primitives — no external GLTF/GLB assets required.

**Skeleton hierarchy:**
```
pelvis (root)
├── torso → head
├── leftUpperArm → leftForearm (leftShoulder Euler + leftElbow bend)
├── rightUpperArm → rightForearm
├── leftThigh → leftShin (leftHip Euler + leftKnee bend)
└── rightThigh → rightShin
```

All parts use `MeshStandardMaterial` with configurable `color` and `opacity: 0.85`. Depth testing is controlled by `mannequinOcclusion` state (toggles `depthTest` on the material).

**Body proportions** scale from `height` and `build` params:
- Torso/leg lengths proportional to height
- Shoulder/hip widths proportional to build
- Head size proportional to height

**Pose representation:** `MannequinPose` stores Euler XYZ for shoulders/hips and a single float for elbow/knee bend. Applied via `group.rotation.set(...)` on each joint Group.

### Props: PropMannequin

**File:** `src/components/Mannequins.tsx` → `PropMannequin`

Renders a Three.js geometry based on `asset.shape`:
- `box` → `<boxGeometry>`
- `cylinder` → `<cylinderGeometry>`
- `sphere` → `<sphereGeometry>`
- `cone` → `<coneGeometry>`
- `plane` → `<boxGeometry>` (thin slab)
- `capsule` → `<capsuleGeometry>`
- `dog` → `<ProceduralDog />` (multi-primitive)
- `cat` → `<ProceduralCat />` (multi-primitive)

All sizes initialized from `PROP_SHAPE_DEFAULTS` and independently scalable via gizmo.

### ProceduralAnimals

**File:** `src/components/ProceduralAnimals.tsx`

`ProceduralDog` and `ProceduralCat` are composed from multiple Three.js primitive meshes (capsule body, sphere head, cylinder legs, cone ears, etc.) grouped under a parent `<group>`. These are purely silhouette stand-ins for pre-visualization — not rigged or animated.

### Placement Flow

```
User clicks "Place" button for an asset
  ↓
State: activePlacingAssetId = asset.id
  ↓
Canvas cursor changes to crosshair
PlacementRaycastHelper listens for click events
  ↓
On canvas click:
  raycast from camera through click point against collider mesh
  if hit:
    position = intersection.point
    for characters: surfaceClamp() adjusts Y so feet touch ground
    for props: no Y adjustment (placed at hit point)
  if miss:
    fallback: 5 units forward from camera position
  ↓
dispatch ADD_MANNEQUIN with position/rotation/scale
activePlacingAssetId cleared
```

### Surface Clamping (`src/utils/surfaceClamp.ts`)

For character mannequins, after the initial hit point is found, `computeFeetOffset()` performs a secondary raycast straight downward from the hit point to find the exact surface. The function returns a Y offset to apply so the character's feet visually contact the ground plane rather than floating or clipping.

### Gizmo Controls

Each placed mannequin/prop has a `MannequinGizmo` (wrapping drei's `TransformControls`) that activates when the mannequin is selected. Keyboard shortcuts while gizmo is active:
- `G` → translate mode
- `R` → rotate mode
- `E` → scale mode

`TransformControls` dragging temporarily disables `CameraControls` (via ref) to prevent conflicting orbit input.

---

## 11. Lighting System

### Two-Layer Lighting

**Layer 1 — Scene lighting (global, always present):**
```typescript
<ambientLight intensity={sceneLighting.ambientIntensity} />
<directionalLight intensity={sceneLighting.directionalIntensity} position={[5, 8, 3]} />
```
Controlled via sliders in the sidebar (`SET_SCENE_LIGHTING` action). Defaults: ambient 0.5, directional 1.0.

**Layer 2 — Per-shot lights (placed, shot-scoped):**
Each `LightPlacement` renders a Three.js `<pointLight>` or `<spotLight>` at its stored position. Lights are filtered by `shotId === activeShot.id` so only the active shot's lights are visible.

### Color Temperature

`src/utils/kelvinToColor.ts` implements the Tanner Helland algorithm to convert Kelvin (1000K–40000K) to an RGB hex string. Common reference points:
- 1800K — candlelight (very warm orange)
- 3200K — tungsten (warm yellow)
- 5500K — daylight (neutral white)
- 7000K+ — overcast sky (cool blue)

`blendKelvinWithTint(kelvin, tintColor)` multiplies the Kelvin RGB by the tint hex channel-by-channel, allowing artistic color grading on top of physical temperature.

### Light Visual Helpers

Each light in the scene renders helper geometry (marked with `userData.isLightHelper = true`) for visibility during editing:
- **Point light:** Emissive sphere at light position + color label (HTML).
- **Spot light:** Emissive sphere + wireframe cone showing cone angle and direction.

Before any capture is taken, all objects with `userData.isLightHelper === true` are hidden (visibility toggled off), the screenshot is taken, then they are restored.

### Light Placement Flow

```
User clicks "Add Light" (or light type button)
  ↓
State: lightingModeEnabled = true, activePlacingLightType = 'point' | 'spot'
  ↓
LightPlacementHelper: canvas click → raycast → position
  ↓
dispatch ADD_LIGHT with DEFAULT_LIGHT merged with position + shotId
  ↓
LightGizmo appears on new light; user can reposition/reorient
```

### Shot Light Inheritance

On `SET_ACTIVE_SHOT`: if the target shot has zero light placements, the reducer clones all lights from the previous shot into the new shot (with fresh UUIDs and updated `shotId`). This gives each new shot a starting lighting setup based on the previous one.

---

## 12. Camera System

CineBlock's camera system has four independent layers that compose at runtime.

### Layer 1: Orbit Controls

`CameraControls` from `@react-three/drei` provides:
- Mouse drag → orbit (rotate around target)
- Scroll wheel → zoom (dolly)
- Smooth interpolation (`smoothTime: 0.25`)
- Programmatic reset via `cameraResetRef.current()` → `setLookAt(3, 2, 3, 0, 0, 0)`

The controls instance is passed by ref to mannequin and light gizmos so dragging a gizmo can call `controls.enabled = false` to prevent orbit interference.

### Layer 2: Keyboard Translation

`CameraKeyboardDriver` (inside Canvas, uses `useFrame` hook):
- `W` / `S` → move forward / backward in camera's local space
- `A` / `D` → strafe left / right
- `Q` / `E` → move down / up (elevate)
- Speed: 2 units/second, delta-time scaled for frame-rate independence

### Layer 3: Dutch Angle (Roll)

`CameraRollDriver` (inside Canvas, uses `useFrame` hook):
- `state.rollAngle` (degrees) is read each frame
- Applied by computing a rotation quaternion around the camera's forward axis and rotating `camera.up` accordingly
- `T` key resets roll to 0° (dispatches `SET_ROLL_ANGLE` with `0`)
- Roll angle is stored in state and serialized into each `CaptureEntry`

### Layer 4: Viewfinder Overlay (UI only)

An absolutely-positioned HTML `<div>` overlay on the canvas. It does not affect the Three.js camera — it is a visual crop indicator only.

Aspect ratio mapping:
```typescript
const ASPECT_RATIOS = {
  '16:9':   16 / 9,     // standard widescreen
  '2.39:1': 2.39,       // anamorphic / scope
  '4:3':    4 / 3,      // classic / boxy
  '9:16':   9 / 16,     // vertical / mobile
};
```

Sizing logic: if the ratio is wider than ~2.0, the viewfinder is sized relative to canvas width (filling full width, letterboxed top/bottom). Otherwise it is sized relative to canvas height (filling full height, pillarboxed left/right).

A dark `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` on the viewfinder div creates the vignette mask effect without any compositing passes.

### Lens Presets (Cosmetic)

Three hardcoded lens labels cycle on a keyboard shortcut (no actual focal length change):
- 35mm f/1.8
- 50mm f/1.4
- 85mm f/1.2

These are display-only. The Three.js `PerspectiveCamera` FoV is not modified.

---

## 13. Capture Pipeline

### How a Capture Is Taken

```
User presses Space or clicks Capture button
  ↓
1. Light helpers hidden (traverse scene, userData.isLightHelper → visible=false)
2. gl.domElement.toDataURL('image/png') → full canvas PNG as base64 string
3. Light helpers restored (visible=true)
4. Viewfinder bounds computed in canvas pixel coordinates
   (center of canvas - half of viewfinder width/height)
5. Offscreen <canvas> created at viewfinder pixel dimensions
6. ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, 0, 0, dstW, dstH)
   → crops to exact viewfinder area
7. croppedCanvas.toDataURL('image/png') → cropped base64 PNG
8. dispatch ADD_CAPTURE with:
   { id, shotId, frameType, dataUrl, isHero: false, capturedAt, rollAngle }
```

The first capture taken for a given `shotId + frameType` combination is automatically promoted to `isHero: true` by the component (not the reducer).

### Capture Storage

All captures live in `state.captures[]` as base64 data URLs. There is no server upload — everything is in-memory in the browser. On page refresh, all captures are lost. For persistence, the export ZIP must be downloaded.

### Hero Selection

Only one hero is allowed per `shotId + frameType`. `TOGGLE_HERO` in the reducer:
1. Finds the target capture.
2. Sets all captures with the same `shotId + frameType` to `isHero: false`.
3. Sets the target capture to `isHero: true`.

---

## 14. Export System

### ZIP Export

Triggered from ResultsView. Uses JSZip + file-saver.

**ZIP structure:**
```
cineblock-export.zip
├── shot-A1-start/
│   ├── start-01.png    (hero)
│   ├── start-02.png    (alternate)
│   └── ...
├── shot-A1-end/
│   └── end-01.png
├── shot-A2-start/
│   └── start-01.png
└── ...
```

Filename convention: `{frameType}-{two-digit-index}.png`. Hero frame is always `01`. Files are the raw cropped PNG data URLs decoded to Uint8Array.

### JSON Export

Downloaded as `cineblock-export.json`. Contains two keys:

**`cineblock` (human-readable):**
```json
{
  "cineblock": {
    "aspectRatio": "16:9",
    "shots": [
      {
        "id": "...",
        "name": "A1",
        "action": "John enters the room",
        "cameraType": "Wide",
        "duration": 8,
        "assets": [...],
        "captures": {
          "start": { "hero": "...(dataUrl)...", "alternates": [...] },
          "end": { "hero": null, "alternates": [] }
        }
      }
    ],
    "assets": [...],
    "generationSettings": { "model": "...", "splatResolution": "..." },
    "worldId": "..."
  }
}
```

**`aiuteur` (structured for AI pipeline):**
```json
{
  "aiuteur": {
    "version": "1.0",
    "project": {
      "aspectRatio": "16:9",
      "totalShots": 3
    },
    "shots": [
      {
        "index": 0,
        "id": "...",
        "name": "A1",
        "action": "...",
        "camera": {
          "type": "Wide",
          "distance": "wide",
          "height": "eye_level",
          "movement": "static"
        },
        "duration": 8,
        "assets": [
          { "id": "...", "name": "John", "type": "character", "color": "#3B82F6" }
        ],
        "heroFrames": {
          "start": "...(dataUrl)...",
          "end": null
        }
      }
    ]
  }
}
```

---

## 15. Keyboard Shortcuts Reference

| Key | Context | Action |
|---|---|---|
| `Space` | Studio canvas focused | Capture current viewfinder frame |
| `1` | Studio | Switch to Start frame type |
| `2` | Studio | Switch to End frame type |
| `L` | Studio | Toggle lighting edit mode |
| `T` | Studio | Reset camera roll angle to 0° |
| `W/A/S/D` | Studio | Move camera forward/left/back/right |
| `Q/E` | Studio | Move camera down/up |
| `Escape` | Studio | Deselect active mannequin/light |
| `G` | Gizmo active | Switch to Translate mode |
| `R` | Gizmo active | Switch to Rotate mode |
| `E` | Gizmo active | Switch to Scale mode (mannequins only) |
| `←/→` | ResultsView lightbox | Navigate between captures |
| `Escape` | ResultsView lightbox | Close lightbox |

---

## 16. Testing Architecture

**Framework:** Vitest 4.1.0, `environment: 'node'` (no JSDOM).

**Philosophy:** Tests operate on the pure reducer function and utility functions only. No component rendering, no Three.js, no API calls. This keeps tests fast and side-effect-free.

**Test files in `src/__tests__/`:**

| File | What It Tests |
|---|---|
| `store.test.ts` | Initial state shape, navigation, world status transitions, azimuth slot CRUD, asset CRUD + cascading, shot CRUD, captures, hero toggle |
| `assetPlacement.test.ts` | Mannequin add/update/remove, placement data integrity |
| `lighting.test.ts` | Light add/update/remove, scene lighting, light auto-clone on shot switch |
| `propShapes.test.ts` | `PROP_SHAPES` enum completeness, `PROP_SHAPE_DEFAULTS` coverage |
| `marbleApi.test.ts` | API request body construction, response parsing |
| `cameraControls.test.ts` | Camera state (roll angle, frame type) |

**Running tests:**
```bash
npm run test      # or: npx vitest
npx vitest --ui   # interactive UI
npx vitest run    # single-pass (CI mode)
```

**Test pattern example:**
```typescript
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../store';

describe('reducer: lighting', () => {
  it('ADD_LIGHT appends to lightPlacements', () => {
    const light = { id: 'l1', shotId: 's1', lightType: 'spot', ... };
    const state = reducer(initialState, { type: 'ADD_LIGHT', light });
    expect(state.lightPlacements).toHaveLength(1);
    expect(state.lightPlacements[0].id).toBe('l1');
  });
});
```

---

## 17. Environment & Build

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MARBLE_API_KEY` | Yes | World Labs API key with `WLT-Api-Key` prefix |

Stored in a `.env` file at the project root (never committed). Accessed at runtime via `import.meta.env.VITE_MARBLE_API_KEY`.

If the key is missing, `getApiKey()` in `marbleApi.ts` throws immediately — the app will error on the first generation attempt.

### Build Scripts

```bash
npm run dev       # Vite dev server (hot reload)
npm run build     # TypeScript type-check → Vite production bundle → dist/
npm run preview   # Serve dist/ locally
```

### Vite Config

```typescript
// vite.config.ts
{
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'node',
  }
}
```

Tailwind CSS 4 is integrated as a Vite plugin (not PostCSS). No `tailwind.config.js` file — configuration is CSS-first via `@theme` in CSS.

### TypeScript Config

Key settings in `tsconfig.json`:
- `"target": "ES2023"` — modern JS output
- `"strict": true` — full strict mode
- `"moduleResolution": "bundler"` — Vite-compatible resolution
- `"jsx": "react-jsx"` — automatic JSX transform (no import React needed)
- `"skipLibCheck": true` — ignores type errors in node_modules (needed for Spark preview)

---

## 18. Integration Guidance

### Embedding CineBlock Into a Larger App

CineBlock is a **self-contained React application** with its own state and routing. There are several integration strategies:

#### Option A: iframe embed

The simplest approach. Host CineBlock as a separate origin and embed it via `<iframe>`. Use `window.postMessage` to pass API keys and receive export data.

```javascript
// Parent app sends API key
iframeEl.contentWindow.postMessage({
  type: 'CINEBLOCK_INIT',
  apiKey: 'WLT-...',
}, 'https://your-cineblock-host.com');

// CineBlock posts export on completion
window.addEventListener('message', (e) => {
  if (e.data.type === 'CINEBLOCK_EXPORT') {
    const { json, zipBlob } = e.data;
    // handle in parent
  }
});
```

To enable this, CineBlock's export handlers in `ResultsView.tsx` need to be modified to `postMessage` instead of (or in addition to) triggering browser downloads.

#### Option B: Library / Module extraction

Extract CineBlock's state (`store.tsx`, `types.ts`), services (`marbleApi.ts`), and 3D components as importable modules. The three views become renderable components your host app mounts when needed.

**What needs to change:**
- Replace `CineBlockProvider` wrapping in `main.tsx` with a provider embedded in your host app's component tree.
- Remove `App.tsx` view-switcher; your host app controls navigation.
- Pass the API key from your host's environment rather than `import.meta.env`.

#### Option C: Aiuteur JSON as the integration contract

The recommended approach for AI pipeline integration. Treat CineBlock as a black box that produces the `aiuteur` JSON format. Your pipeline consumes that JSON and uses the `heroFrames` base64 PNGs as image references for generation.

**Aiuteur JSON contract** (per-shot):
```json
{
  "index": 0,
  "id": "uuid",
  "name": "A1",
  "action": "Director's action line",
  "camera": {
    "type": "Wide | Medium | Close-Up | OTS | POV | Two-Shot | Insert",
    "distance": "wide | medium | close",
    "height": "eye_level | high_angle | low_angle | overhead | ground_level",
    "movement": "freeform string"
  },
  "duration": 8,
  "assets": [
    { "id": "uuid", "name": "Character Name", "type": "character | prop", "color": "#hex" }
  ],
  "heroFrames": {
    "start": "data:image/png;base64,...",
    "end": null
  }
}
```

### Key Integration Considerations

1. **API key security:** `VITE_MARBLE_API_KEY` is a client-side environment variable — it is bundled into the JavaScript output and visible in DevTools. For production, proxy Marble API calls through your own backend and issue short-lived tokens to the browser.

2. **Capture memory:** All captures are base64 PNGs in browser memory. A full shot list with multiple captures per shot can easily exceed 50–100MB of RAM. For large productions, replace the in-memory store with IndexedDB or upload captures to your backend after each capture.

3. **Splat loading performance:** The `.spz` files from Marble API can be large (tens to hundreds of MB for `full_res`). Consider lazy-loading or showing a progress indicator. `SplatMesh` from SparkJS handles streaming internally but initial load can still stall on slow connections.

4. **SparkJS preview status:** `@sparkjsdev/spark` is installed from a GitHub branch tag (`v2.0.0-preview`), not an npm release. Its API is unstable. Pin your exact commit hash rather than the branch tag to prevent upstream breakage:
   ```json
   "@sparkjsdev/spark": "github:sparkjsdev/spark#<commit-sha>"
   ```

5. **No server-side state:** CineBlock has no backend, no database, no auth. All data is ephemeral to the browser session. Your integration must decide how and when to persist state (download on completion, autosave to IndexedDB, sync to your backend, etc.).

6. **Collider mesh required for placement:** If you want to support mannequin or light placement, both the `.spz` and the `.collider_mesh_url` GLB must be loaded. The collider is what enables click-to-place raycasting. Without it, placement falls back to a 5-unit-forward heuristic.

7. **Coordinate system:** CineBlock uses **Three.js world space** (Y-up, right-handed). The Marble API uses computer-vision convention (Y-down). The `Math.PI` Y-rotation applied in `MarbleWorld.tsx` converts between them. If you build your own viewer on top of the Marble API output, you will need the same rotation.

8. **Gaussian splat depth buffer interaction:** The SparkJS `SparkRenderer` writes to the depth buffer, which means standard Three.js meshes placed in the same scene will correctly occlude/be-occluded by the splat. However, transparent meshes (mannequins at `opacity: 0.85`) can have artifacts — this is why `mannequinOcclusion` is a toggleable option.

### Extending the Shot Model

If your filmmaking application needs additional per-shot metadata (e.g., lens selection, film stock, color grade reference), add fields to `CineBlockShot` in `types.ts` and corresponding `UPDATE_SHOT` dispatches. The Aiuteur JSON export in `ResultsView.tsx` would need to be updated to include those fields in the `camera` or a new `cinematography` object.

### Replacing Marble API

If you want to use a different world generation backend (or pre-load an existing world), the Marble API layer is isolated in `src/services/marbleApi.ts`. To replace it:
1. Return the same `{ spzUrl, colliderUrl, worldId }` shape from your backend.
2. Dispatch `SET_WORLD_DATA` with those values.
3. The rest of CineBlock (`StudioView`, `MarbleWorld`, all placement logic) will work unchanged.

You can also skip generation entirely and dispatch `SET_WORLD_DATA` directly with pre-existing `.spz` and `.glb` URLs for testing or pre-built environments.

---

*Generated 2026-04-19 — covers CineBlock as of branch `world-gen-gooder`.*
