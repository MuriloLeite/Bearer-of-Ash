// Asset Loader - Manages loading and caching of game assets
window.GAME_TEXTURES = {
  player: [],
  enemy: [],
  world: {},
  altar: [],
  torch: [],
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

    const worldAssets = [
      "./game_assets/world/scenario.png",
      "./game_assets/world/tocha-frente.png",
      "./game_assets/world/tocha-lateral.png",
      "./game_assets/world/banco.png",
      "./game_assets/world/pedra.png",
      "./game_assets/world/portal.png",
      "./game_assets/world/poste.png",
    ];

    const allAssets = [...playerAssets, ...enemyAssets, ...worldAssets];
    let toLoad = allAssets.length;
    let loaded = 0;

    function onAssetLoaded(asset, category, index) {
      if (category === "player") {
        window.GAME_TEXTURES.player[index] = asset.resource;
      } else if (category === "enemy") {
        window.GAME_TEXTURES.enemy[index] = asset.resource;
      } else if (category === "world") {
        const name = asset.name.toLowerCase();
        window.GAME_TEXTURES.world[name] = asset.resource;
      }

      loaded++;
      if (loaded === toLoad) {
        console.log("✅ All assets loaded successfully!");
        resolve(window.GAME_TEXTURES);
      }
    }

    // Load player assets
    playerAssets.forEach((url, index) => {
      const asset = new pc.Asset(`player_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "player", index));
      app.assets.load(asset);
    });

    // Load enemy assets
    enemyAssets.forEach((url, index) => {
      const asset = new pc.Asset(`enemy_${index}`, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "enemy", index));
      app.assets.load(asset);
    });

    // Load world assets
    worldAssets.forEach((url) => {
      const name = url.split("/").pop().split(".")[0];
      const asset = new pc.Asset(name, "texture", { url: url });
      app.assets.add(asset);
      asset.once("load", () => onAssetLoaded(asset, "world"));
      app.assets.load(asset);
    });
  });
}
