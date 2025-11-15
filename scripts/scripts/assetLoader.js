// Asset Loader - Manages loading and caching of game assets
window.GAME_TEXTURES = {
  player: [],
  enemy: [],
  vision: [], // NOVO: texturas de visão do inimigo
  world: {},
  altar: [], // 5 frames: 0 velas, 1 vela, 2 velas, 3 velas, 4 velas (completo)
  torch: [], // 2 frames: apagada (0), acesa (1)
};

function loadGameAssets(app) {
  return new Promise((resolve) => {
    // Define asset lists by category
    const playerAssets = [
      "./game_assets/player/player_front.png",
      "./game_assets/player/player_back.png",
      "./game_assets/player/player_side.png",
    ];

    const enemyAssets = [
      "./game_assets/enemy/enemy_front.png",
      "./game_assets/enemy/enemy_back.png",
      "./game_assets/enemy/enemy_side.png",
    ];

    // NOVO: Assets de visão do inimigo (cone amarelo)
    const visionAssets = [
      "./game_assets/enemy/enemy_vision_back.png",
      "./game_assets/enemy/enemy_vision_front.png",
      "./game_assets/enemy/enemy_vision_side.png",
    ];

    const worldAssets = [
      "./game_assets/world/scenario.png",
      "./game_assets/world/tocha-frente.png",
      "./game_assets/world/tocha-lateral.png",
      "./game_assets/world/banco.png",
      "./game_assets/world/pedra.png",
      "./game_assets/world/portal.png",
      "./game_assets/world/poste.png",
    ];

    // Assets do círculo mágico (0 a 4 velas acesas)
    const altarAssets = [
      "./game_assets/magic/magic_circle.png", // 0 velas
      "./game_assets/magic/magic_circle_01.png", // 1 vela
      "./game_assets/magic/magic_circle_02.png", // 2 velas
      "./game_assets/magic/magic_circle_03.png", // 3 velas
      "./game_assets/magic/magic_circle_completed.png", // 4 velas
    ];

    // Assets das tochas (apagada e acesa)
    const torchAssets = [
      "./game_assets/world/tocha-frente.png", // 0 = apagada
      "./game_assets/world/tocha-lateral.png", // 1 = acesa
    ];

    const allAssets = [
      ...playerAssets,
      ...enemyAssets,
      ...visionAssets,
      ...worldAssets,
      ...altarAssets,
      ...torchAssets,
    ];
    let toLoad = allAssets.length;
    let loaded = 0;

    function onAssetLoaded(asset, category, index) {
      if (category === "player") {
        window.GAME_TEXTURES.player[index] = asset.resource;
      } else if (category === "enemy") {
        window.GAME_TEXTURES.enemy[index] = asset.resource;
      } else if (category === "vision") {
        window.GAME_TEXTURES.vision[index] = asset.resource;
      } else if (category === "altar") {
        var tex = asset ? asset.resource : null;
        if (tex) {
          // Configuração para sprites/PNGs pequenos
          tex.minFilter = pc.FILTER_NEAREST;
          tex.magFilter = pc.FILTER_NEAREST;
          tex.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
          tex.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
          tex.anisotropy = 1;
          if (typeof tex.upload === "function") {
            try {
              tex.upload();
            } catch (e) {}
          }
          if (console && console.debug) {
            console.debug(
              "🧩 Altar tex[" + index + "]:",
              tex.width + "x" + tex.height
            );
          }
        }
        window.GAME_TEXTURES.altar[index] = tex;
      } else if (category === "torch") {
        window.GAME_TEXTURES.torch[index] = asset ? asset.resource : null;
      } else if (category === "world") {
        const name = asset.name;
        window.GAME_TEXTURES.world[name] = asset.resource;
      }

      loaded++;
      if (loaded === toLoad) {
        console.log("✅ Todos os assets carregados:", window.GAME_TEXTURES);
        resolve(window.GAME_TEXTURES);
      }
    }

    // Load player assets
    playerAssets.forEach((url, index) => {
      const asset = new pc.Asset(`player_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "player", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load player asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // Load enemy assets
    enemyAssets.forEach((url, index) => {
      const asset = new pc.Asset(`enemy_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "enemy", index));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load enemy asset ${index}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });

    // NOVO: Load vision assets
    visionAssets.forEach((url, index) => {
      const asset = new pc.Asset(`vision_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "vision", index));
      asset.once("error", (err) => {
        /* Lines 100-104 omitted */
      });
      app.assets.load(asset);
    });

    // Load altar (magic circle) assets
    altarAssets.forEach((url, index) => {
      const asset = new pc.Asset(`altar_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "altar", index));
      asset.once("error", (err) => {
        console.warn(`❌ Failed to load altar asset ${index}:`, err);
        onAssetLoaded(null, "altar", index);
      });
      app.assets.load(asset);
    });

    // Load torch assets
    torchAssets.forEach((url, index) => {
      const asset = new pc.Asset(`torch_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "torch", index));
      asset.once("error", (err) => {
        console.warn(`❌ Failed to load torch asset ${index}:`, err);
        onAssetLoaded(null, "torch", index);
      });
      app.assets.load(asset);
    });

    // Load world assets
    worldAssets.forEach((url) => {
      const name = url.split("/").pop().split(".")[0];
      const asset = new pc.Asset(name, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "world"));
      asset.once("error", (err) => {
        console.error(`❌ Failed to load world asset ${name}:`, err);
        loaded++;
        if (loaded === toLoad) resolve(window.GAME_TEXTURES);
      });
      app.assets.load(asset);
    });
  });
}
