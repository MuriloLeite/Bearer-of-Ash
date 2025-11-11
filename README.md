# Bearer of Ash (PlayCanvas)

Top-down action game built for the PlayCanvas engine, authored entirely in JavaScript scripts (pc.createScript) in VS Code.

This repo supports two workflows:
- Engine-only local run (no PlayCanvas Editor): open `index.html`, which uses `scripts/bootstrap.js` to build the scene and UI at runtime with textures.
- Editor workflow (optional): upload scripts and images into a PlayCanvas project and wire components/attributes in the Editor.

## 📁 Folder Structure (local / VS Code)

```
/project (this repo)
  /images
    /hero
    /enemy
    /altar
    /torch
    map.jpg
  /scripts
    playerController.js
    enemyAI.js
    torch.js
    altar.js
    gameManager.js
    uiManager.js
    bootstrap.js
  index.html
```

Import these files into your PlayCanvas project (Assets → Upload). For images, create Sprite assets (Animated where appropriate).

## 🏗 Scene Hierarchy

If you use the Editor workflow, create two scenes in PlayCanvas:

1) Menu
- Screen (Screen Space)
  - MenuPanel (Element: Group)
    - Title (Element: Text)
    - Buttons (Element: Button for each) → Easy, Normal, Hard, Credits, Exit, Start
  - PausePanel (hidden)
  - HudPanel (hidden)
  - WinPanel (hidden)
  - LosePanel (hidden)
  - CreditsPanel (hidden)
- UiManager (Entity with Script: uiManager)

2) TinwoodGrove (Game)
- Camera (Orthographic) looking down Y-
- Background (Element: Image) using images/map.jpg (stretched or scaled to world)
- Player (Sprite, Collision optional)
  - Script: playerController
- Torches (4 suggested)
  - Torch_01..04 (Sprite 2 frames)
    - Script: torch
- Altar (Sprite 5 frames)
  - Script: altar
- GameManager (Empty)
  - Script: gameManager
  - EnemyPrefab (disabled child with Sprite + Script enemyAI)
- UI (Screen Space)
  - HudPanel (Element: Group)
    - TorchesText (Text)
    - DifficultyText (Text)
    - HintText (Text optional)
  - Pause/Win/Lose panels if you prefer them in-game too
  - Script: uiManager (optional in game scene if you don’t reuse Menu scene)

For the engine-only local flow, `scripts/bootstrap.js` programmatically creates an equivalent hierarchy at runtime and loads textures directly from the `images/` folder.

## 🧩 Scripts (attach via Script Component)

- playerController.js → on Player entity
  - Move with WASD on XZ plane
  - Hold E to ignite a nearby torch
  - Sprite animation with 3 frames
- enemyAI.js → on Enemy entities (and EnemyPrefab)
  - Seeks lit torches and extinguishes them
  - Optional chase player if close
- torch.js → on each Torch entity
  - Manages lit/unlit state, ignition/extinguish
  - Emits events used by GameManager/UI
- altar.js → on Altar entity
  - Shows lit count (frame 0..4) and triggers victory
- gameManager.js → on a GameManager entity
  - Tracks torches, spawns enemies, difficulty, win/lose
- uiManager.js → on UI root (Menu or Game depending on setup)
  - Buttons and HUD updates, pause/resume, scene loading

## ⚙️ Component Setup in Editor (optional)

General
- Use a 2D top-down layout with the XZ plane; keep Y = 0 for gameplay entities.
- Camera → Orthographic (size tuned to your world). Point forward to (0, -1, 0), position around (0, 10, 0).

Player
- Sprite Component: set a Sprite with 3 frames (grid or clips). The script uses `sprite.frame` to animate.
- (Optional) Collision (Capsule/Box) + Rigidbody (Kinematic) if you want triggers; the scripts also work by distance check.
- Script Component → add playerController
  - moveSpeed ≈ 2.2
  - animFps = 10, frames = 3
  - interactionRadius = 1.5
  - gameManager = GameManager entity

Torch (repeat per torch)
- Sprite Component: 2 frames (0=unlit, 1=lit) OR use a Sprite with two images.
- Tag the torch entity with `torch` (script also adds it automatically if not set).
- Script Component → add torch
  - startLit (as desired)
  - igniteTime ≈ 1.2s; extinguishTime depends on difficulty (enemyAI overrides its own)

Altar
- Sprite Component: 5 frames total. Frame index equals number of torches lit (0..4).
- Script Component → add altar

Enemies
- Create one EnemyPrefab entity under GameManager (disabled), with Sprite (3 frames) and Script enemyAI.
- EnemyPrefab will be cloned/spawned by GameManager.

GameManager
- Script Component → add gameManager
  - difficulty: Easy/Normal/Hard (overridden by menu selection via localStorage)
  - player: Player entity
  - altar: Altar entity
  - uiManager: UI entity (in-game HUD)
  - enemyPrefab: EnemyPrefab child (disabled template)
  - spawnPoints: add a few empty entities in the map as spawn origins

UI / Menu
- Create a Screen Space UI with Element: Group panels for Menu, HUD, Pause, Win, Lose, Credits.
- Add Buttons with Element + Button components; wire them to uiManager attributes.
- Script Component → add uiManager and assign panel entities and text elements.

## 🔄 Game Flow

1) Menu scene loads with uiManager showing MenuPanel.
2) Choose difficulty (Easy/Normal/Hard) → saved to localStorage.
3) Start → loads TinwoodGrove scene; uiManager shows HUD and fires `game:resume`.
4) Player explores and ignites torches with E; enemies spawn and try to extinguish.
5) Altar updates frames based on lit count; when all lit and held for a short time, victory.
6) If all torches are out, defeat.
7) Pause with ESC → Resume/Restart/Return to Main.

## 🎛 Difficulty (defaults in GameManager)

- Easy: enemySpeed 1.6, detectRange 6, spawnInterval 10s, maxEnemies 4, extinguishTime 3.0s
- Normal: 2.1, 8, 7s, 6, 2.2s
- Hard: 2.7, 10, 5s, 8, 1.6s

## ✨ Suggestions / Extras

- Sounds: add SFX on ignite/extinguish, ambient loop on camera; control via uiManager.
- Particles: small sparks on ignite and smoke on extinguish (connect to torch script attributes).
- Saving: persist last difficulty and audio volume via localStorage.
- Navmesh: if needed, switch enemy movement to navmesh pathfinding.
- Touch/Gamepad: add alternate input in playerController.

## Notes

- Engine-only local run:
  - Open a local web server in the repo root and navigate to `http://localhost:PORT/` to load `index.html`.
  - Asset file names expected by default (adjust in `scripts/bootstrap.js` if different):
    - `images/hero/hero_0.png, hero_1.png, hero_2.png`
    - `images/enemy/enemy_0.png, enemy_1.png, enemy_2.png`
    - `images/torch/unlit.png, images/torch/lit.png`
    - `images/altar/altar_0.png … altar_4.png`
    - `images/map.jpg`
- Editor workflow:
  - Create Sprite assets and assign to entities. The scripts also support texture-only mode via Render components (attributes `frameTextures`, `unlitTexture`, `litTexture`).
  - UI expects Element components; bind via script attributes in the Editor.
