// Bootstrap v5 - Com sistema de visão completo
(function () {
  "use strict";

  console.log("🚀 Bootstrap v5 - Com área de visão do inimigo");

  function loadGameScripts(callback) {
    var scripts = [
      "scripts/assetLoader.js", // Carrega primeiro o asset loader
      "scripts/playerController.js",
      "scripts/enemyAI.js",
      "scripts/gameManager.js",
      "scripts/uiManager.js",
    ];
    var loaded = 0;

    function checkComplete() {
      loaded++;
      if (loaded === scripts.length) {
        console.log("✅ All scripts loaded");
        callback();
      }
    }

    scripts.forEach(function (src) {
      var script = document.createElement("script");
      script.src = src + "?v=" + Date.now();
      script.onload = checkComplete;
      script.onerror = function () {
        console.error("❌ Failed to load:", src);
        checkComplete();
      };
      document.head.appendChild(script);
    });
  }

  function makeMaterial(tex) {
    var mat = new pc.StandardMaterial();
    mat.diffuseMap = tex;
    mat.emissive = new pc.Color(1, 1, 1);
    mat.emissiveMap = tex;
    mat.useLighting = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    return mat;
  }

  function createButton(app, screen, text, pos, size, onClick) {
    var btn = new pc.Entity("Button_" + text);
    btn.addComponent("element", {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: size.x,
      height: size.y,
      color: new pc.Color(0.2, 0.2, 0.25),
      useInput: true,
      opacity: 0.9,
    });
    btn.setLocalPosition(pos.x, pos.y, 0);
    btn.addComponent("button", {
      imageEntity: btn,
      hoverTint: new pc.Color(0.3, 0.3, 0.4),
      pressedTint: new pc.Color(0.15, 0.15, 0.2),
    });

    var label = new pc.Entity("Label");
    label.addComponent("element", {
      type: pc.ELEMENTTYPE_TEXT,
      anchor: [0.5, 0.5, 0.5, 0.5],
      pivot: [0.5, 0.5],
      width: size.x,
      height: size.y,
      fontSize: 32,
      color: new pc.Color(1, 1, 1),
      text: text,
      outlineColor: new pc.Color(0, 0, 0),
      outlineThickness: 0.3,
    });
    btn.addChild(label);
    screen.addChild(btn);
    btn.button.on("click", onClick);
    return btn;
  }

  function main() {
    console.log("🎮 Starting game with vision system...");

    var canvas = document.getElementById("application-canvas");
    var app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      keyboard: new pc.Keyboard(window),
      elementInput: new pc.ElementInput(canvas),
    });
    app.start();
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    window.addEventListener("resize", function () {
      app.resizeCanvas();
    });

    loadGameScripts(function () {
      // Aguarda o asset loader carregar os assets
      if (typeof loadGameAssets === "function") {
        console.log("📦 Loading game assets...");
        loadGameAssets(app).then(function () {
          console.log("✅ Assets loaded, building scene...");
          buildScene(app);
        });
      } else {
        console.warn("⚠️ loadGameAssets not found, building scene without assets");
        buildScene(app);
      }
    });
  }

  function buildScene(app) {
    var world = new pc.Entity("World");
    app.root.addChild(world);

    var ui = new pc.Entity("UI");
    ui.addComponent("screen", {
      screenSpace: true,
      referenceResolution: new pc.Vec2(1280, 720),
      scaleBlend: 0.5,
      scaleMode: pc.SCALEMODE_BLEND,
    });
    app.root.addChild(ui);

    // Camera
    var camera = new pc.Entity("Camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.1, 0.1, 0.1),
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 14,
      nearClip: 0.1,
      farClip: 100,
    });
    camera.setLocalPosition(0, 0, 20);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // Light
    var light = new pc.Entity("Light");
    light.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 1, 1),
      intensity: 1,
    });
    light.setLocalEulerAngles(45, 30, 0);
    app.root.addChild(light);

    // UI Panels
    var menuPanel = new pc.Entity("MenuPanel");
    menuPanel.addComponent("element", {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
      color: new pc.Color(0, 0, 0, 0.95),
      opacity: 0.95,
    });
    ui.addChild(menuPanel);

    var hudPanel = new pc.Entity("HudPanel");
    hudPanel.addComponent("element", {
      type: pc.ELEMENTTYPE_GROUP,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
    });
    ui.addChild(hudPanel);

    var pausePanel = new pc.Entity("PausePanel");
    pausePanel.addComponent("element", {
      type: pc.ELEMENTTYPE_GROUP,
      anchor: [0, 0, 1, 1],
      pivot: [0.5, 0.5],
    });
    pausePanel.enabled = false;
    ui.addChild(pausePanel);

    // HUD Info
    var enemyCountText = new pc.Entity("EnemyCountText");
    enemyCountText.addComponent("element", {
      type: pc.ELEMENTTYPE_TEXT,
      anchor: [0, 1, 0, 1],
      pivot: [0, 1],
      fontSize: 28,
      color: new pc.Color(1, 0.5, 0.5),
      text: "👹 0",
      outlineColor: new pc.Color(0, 0, 0),
      outlineThickness: 0.3,
    });
    enemyCountText.setLocalPosition(25, -25, 0);
    hudPanel.addChild(enemyCountText);

    // Menu Buttons
    var btnStart = createButton(
      app,
      menuPanel,
      "Start Game",
      new pc.Vec3(0, 100, 0),
      new pc.Vec2(280, 56),
      function () {
        app.fire("game:reset");
        app.fire("game:resume");
        menuPanel.enabled = false;
        hudPanel.enabled = true;
      }
    );

    var btnExit = createButton(
      app,
      menuPanel,
      "Exit",
      new pc.Vec3(0, 20, 0),
      new pc.Vec2(200, 48),
      function () {
        window.close();
      }
    );

    // Pega texturas carregadas do GAME_TEXTURES
    var heroTex = window.GAME_TEXTURES?.player || [];
    var enemyTex = window.GAME_TEXTURES?.enemy || [];
    var visionTex = window.GAME_TEXTURES?.vision || [];
    var mapTex = window.GAME_TEXTURES?.world?.scenario;

    console.log("🎨 Using textures:", {
      hero: heroTex.length,
      enemy: enemyTex.length,
      vision: visionTex.length,
      map: !!mapTex,
    });

    // Background (map)
    var background = new pc.Entity("Background");
    background.addComponent("render", { type: "box" });
    background.setLocalScale(24, 24, 0.1);
    background.setLocalPosition(0, 0, -1);
    if (mapTex) {
      background.render.meshInstances[0].material = makeMaterial(mapTex);
    }
    world.addChild(background);

    // Player
    var player = new pc.Entity("Player");
    player.addComponent("render", { type: "box" });
    player.setLocalScale(1, 1, 0.1);
    player.setLocalPosition(0, -5, 0.02);
    if (heroTex[0]) {
      player.render.meshInstances[0].material = makeMaterial(heroTex[0]);
    }
    player._heroTextures = heroTex;
    player.addComponent("script");
    player.script.create("playerController", {
      attributes: {
        boundsMin: new pc.Vec2(-11, -11),
        boundsMax: new pc.Vec2(11, 11),
      },
    });
    world.addChild(player);

    // GameManager
    var gm = new pc.Entity("GameManager");
    gm.addComponent("script");
    gm.script.create("gameManager");
    world.addChild(gm);

    // Enemy Prefab
    var enemyPrefab = new pc.Entity("EnemyPrefab");
    enemyPrefab.addComponent("render", { type: "box" });
    enemyPrefab.setLocalScale(0.9, 0.9, 0.1);
    if (enemyTex[0]) {
      enemyPrefab.render.meshInstances[0].material = makeMaterial(enemyTex[0]);
    }
    enemyPrefab._enemyTextures = enemyTex;
    enemyPrefab.addComponent("script");
    enemyPrefab.script.create("enemyAI");
    enemyPrefab.enabled = false;
    gm.addChild(enemyPrefab);

    // UI Manager
    var uiMgr = new pc.Entity("UiManager");
    uiMgr.addComponent("script");
    uiMgr.script.create("uiManager", {
      attributes: {
        menuPanel: menuPanel,
        hudPanel: hudPanel,
        pausePanel: pausePanel,
        enemyCountText: enemyCountText,
        btnStart: btnStart,
        btnExit: btnExit,
      },
    });
    ui.addChild(uiMgr);

    // Connect scripts
    gm.script.gameManager.player = player;
    gm.script.gameManager.uiManager = uiMgr;
    gm.script.gameManager.enemyPrefab = enemyPrefab;

    // Start paused
    menuPanel.enabled = true;
    hudPanel.enabled = false;
    app.fire("game:pause");

    console.log("✅ Scene built successfully!");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();