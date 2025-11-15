/*
  Celestial Candelarium - altar.js
  - Shows how many torches are lit (0-4)
  - Sprite frame updates: 0..4 corresponds to lit count
  - Emits victory when all are lit
*/

var Altar = pc.createScript("altar");

Altar.attributes.add("maxFrames", {
  type: "number",
  default: 5,
  title: "Frames (0..N-1)",
});
Altar.attributes.add("winDelay", {
  type: "number",
  default: 0.5,
  title: "Win Delay (s) after all lit",
});
// Optional: frames as textures for engine-only mode
Altar.attributes.add("frameTextures", {
  type: "asset",
  array: true,
  title: "Frame Textures (optional)",
});

Altar.prototype.initialize = function () {
  this._lit = 0;
  this._total = 4;
  this._winPending = false;
  this._isIgniting = false;
  this._igniteProgress = 0;
  this._igniteTime = 1.5;
  this._playerEntity = null;

  var hasValidTextures =
    this.frameTextures &&
    this.frameTextures.length > 0 &&
    this.frameTextures[0] !== null;
  if (!hasValidTextures && this.entity._altarTextures) {
    this.frameTextures = this.entity._altarTextures;
    hasValidTextures = true;
  }

  if (!hasValidTextures) {
    if (window.GAME_TEXTURES && window.GAME_TEXTURES.altar) {
      this.frameTextures = window.GAME_TEXTURES.altar;
    }
  }

  if (console && console.log) {
    var len = (this.frameTextures && this.frameTextures.length) || 0;
    console.log("🔮 Altar init: frames carregados =", len);
  }

  this.app.on("altar:update", this._onUpdate, this);
  this.app.on("altar:force", this._onForce, this);

  this._applyFrame();
};

Altar.prototype.onDestroy = function () {
  this.app.off("altar:update", this._onUpdate, this);
  this.app.off("altar:force", this._onForce, this);
};

Altar.prototype._onUpdate = function (lit, total) {
  this._lit = lit | 0;
  this._total = total | 4;
  this._applyFrame();

  if (!this._winPending && this._total > 0 && this._lit >= this._total) {
    this._winPending = true;
    var self = this;
    this.app.once("update", function tick() {
      // small delay; alternatively setTimeout via app
      self._triggerWin();
    });
  }
};

Altar.prototype._onForce = function (frameIndex) {
  var clamped = pc.math.clamp(frameIndex | 0, 0, this.maxFrames - 1);
  if (this.entity.sprite) {
    this.entity.sprite.frame = clamped;
  } else {
    this._applyFrameTexture(clamped);
  }
};

Altar.prototype._applyFrame = function () {
  var frame = pc.math.clamp(this._lit, 0, Math.max(0, this.maxFrames - 1));
  if (this.entity.sprite) {
    this.entity.sprite.frame = frame;
  } else {
    this._applyFrameTexture(frame);
  }
};

Altar.prototype.update = function (dt) {
  if (!this._playerEntity) {
    this._playerEntity = this.app.root.findByName("Player");
  }

  if (!this._playerEntity || this._lit >= this._total) return;

  var playerPos = this._playerEntity.getPosition();
  var altarPos = this.entity.getPosition();
  var dx = playerPos.x - altarPos.x;
  var dy = playerPos.y - altarPos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2.5) {
    // Modo automático: ao permanecer próximo por _igniteTime, acende
    if (!this._isIgniting) {
      this._isIgniting = true;
      this._igniteProgress = 1.5;
      this.app.fire("ui:hint", "🕯️ Acendendo vela... 0%");
    }

    this._igniteProgress += dt;
    var percent = Math.min(
      100,
      Math.floor((this._igniteProgress / this._igniteTime) * 100)
    );
    this.app.fire("ui:hint", "🕯️ Acendendo vela... " + percent + "%");

    if (this._igniteProgress >= this._igniteTime) {
      this._lightCandle();
      this._isIgniting = false;
      this._igniteProgress = 0;
    }
  } else {
    if (this._isIgniting) {
      this._isIgniting = false;
      this._igniteProgress = 0;
    }
    this.app.fire("ui:hint", "");
  }
};

Altar.prototype._lightCandle = function () {
  if (this._lit >= this._total) return;

  this._lit++;
  this._applyFrame();
  if (console && console.log) {
    console.log("🕯️ Vela acesa:", this._lit, "/", this._total);
  }
  this.app.fire("altar:candleLit", this._lit);

  var corners = [
    { x: -9, y: -9 },
    { x: 9, y: -9 },
    { x: -9, y: 9 },
    { x: 9, y: 9 },
  ];
  var randomCorner = corners[Math.floor(Math.random() * corners.length)];

  if (this._playerEntity) {
    this._playerEntity.setPosition(
      randomCorner.x,
      randomCorner.y,
      this._playerEntity.getPosition().z
    );
  }

  this.app.fire(
    "ui:hint",
    "✨ Vela " + this._lit + "/4 acesa! Você foi teleportado!"
  );

  if (this._lit >= this._total && !this._winPending) {
    this._winPending = true;
    var self = this;
    setTimeout(function () {
      self._triggerWin();
    }, 500);
  }
};

Altar.prototype._triggerWin = function () {
  this.app.fire("game:victory");
};

Altar.prototype._applyFrameTexture = function (frameIndex) {
  if (!this.entity.render || !this.frameTextures || !this.frameTextures.length)
    return;
  var asset =
    this.frameTextures[Math.min(frameIndex | 0, this.frameTextures.length - 1)];
  var tex = asset && asset.resource ? asset.resource : asset;
  // Se a textura estiver ausente ou sem tamanho, tenta recuperar do app.assets (nome: altar_i)
  if (
    (!tex || tex.width === 0 || tex.height === 0) &&
    this.app &&
    this.app.assets
  ) {
    var altAsset = this.app.assets.find("altar_" + (frameIndex | 0));
    if (altAsset && altAsset.resource) {
      tex = altAsset.resource;
      if (console && console.warn)
        console.warn("♻️ Recuperado altar_" + frameIndex + " do app.assets");
    }
  }
  if (!tex) return;
  // Força reatribuição de material para garantir atualização visual
  // Se a textura ainda não subiu, tenta upload novamente e loga dimensões
  if (
    tex &&
    (tex.width === 0 || tex.height === 0) &&
    typeof tex.upload === "function"
  ) {
    try {
      tex.upload();
    } catch (e) {}
  }
  if (console && console.log) {
    console.log(
      "🖼️ Frame " + frameIndex + " tex size:",
      tex ? tex.width + "x" + tex.height : "null"
    );
  }

  var mat = new pc.StandardMaterial();
  mat.diffuseMap = tex;
  mat.emissiveMap = tex;
  mat.emissive = new pc.Color(1, 1, 1);
  // Transparência por alpha do PNG
  mat.opacityMap = tex;
  mat.blendType = pc.BLEND_PREMULTIPLIED;
  mat.useLighting = false;
  mat.cull = pc.CULLFACE_NONE;
  mat.update();
  // Atribui nos dois pontos para evitar cache de material
  this.entity.render.meshInstances[0].material = mat;
  this.entity.render.material = mat;
  this.entity.render.castShadows = false;
  this.entity.render.receiveShadows = false;
  if (console && console.log) {
    console.log("🔮 Altar: aplicando frame", frameIndex);
  }
};
