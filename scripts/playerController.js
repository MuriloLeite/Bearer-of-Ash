// playerController.js
// Movimento pelas setas, sprites por direção e hitbox AABB para colisão.

var PlayerController = pc.createScript("playerController");

// Atributos configuráveis
PlayerController.attributes.add("speed", {
  type: "number",
  default: 5,
  title: "Speed",
});
PlayerController.attributes.add("boundsMin", {
  type: "vec2",
  default: [-11, -11],
  title: "Bounds Min",
});
PlayerController.attributes.add("boundsMax", {
  type: "vec2",
  default: [11, 11],
  title: "Bounds Max",
});
// Tamanho do hitbox (largura, altura) em unidades do mundo
PlayerController.attributes.add("hitboxSize", {
  type: "vec2",
  default: [1.0, 1.2],
  title: "Hitbox Size (w,h)",
});

PlayerController.prototype.initialize = function () {
  // teclas
  this.app.keyboard = this.app.keyboard || new pc.Keyboard(window);

  // direção/movimento
  this._dir = new pc.Vec2(0, 0);
  this._lastDir = new pc.Vec2(0, -1); // default apontando para frente (baixo)

  // Texturas - tenta pegar window.GAME_TEXTURES.player ou hero
  this.frameTextures =
    window.GAME_TEXTURES?.player || window.GAME_TEXTURES?.hero || [];

  // garante material para trocar diffuseMap
  var mi =
    this.entity.render &&
    this.entity.render.meshInstances &&
    this.entity.render.meshInstances[0];
  if (mi) {
    this._material = mi.material || new pc.StandardMaterial();
    mi.material = this._material;
  } else {
    this._material = null;
  }

  // Cria/guarda hitbox parâmetros
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;
  // opcional: criar uma entidade visual debug (descomentando) — aqui mantemos invisível

  // cooldown para não contar múltiplos hits por frame (controla quando inimigo encosta no player)
  this._lastHitTime = 0;
  this._hitCooldown = 0.6; // segundos

  console.log(
    "PlayerController inicializado. Hitbox:",
    this._hitW.toFixed(2),
    "x",
    this._hitH.toFixed(2)
  );
};

// update por frame
PlayerController.prototype.update = function (dt) {
  this._readInput();
  this._move(dt);
  this._clampToBounds();
  this._updateSprite();
  // player não é quem contabiliza hits — inimigos checam colisão com o player.
};

// lê setas e normaliza direção
PlayerController.prototype._readInput = function () {
  var x = 0,
    y = 0;
  if (this.app.keyboard.isPressed(pc.KEY_LEFT)) x -= 1;
  if (this.app.keyboard.isPressed(pc.KEY_RIGHT)) x += 1;
  if (this.app.keyboard.isPressed(pc.KEY_UP)) y += 1;
  if (this.app.keyboard.isPressed(pc.KEY_DOWN)) y -= 1;

  if (x !== 0 || y !== 0) {
    var len = Math.sqrt(x * x + y * y);
    this._dir.set(x / len, y / len);
    this._lastDir.copy(this._dir);
  } else {
    this._dir.set(0, 0);
  }
};

// aplica movimento
PlayerController.prototype._move = function (dt) {
  if (this._dir.lengthSq() === 0) return;
  var dx = this._dir.x * this.speed * dt;
  var dy = this._dir.y * this.speed * dt;
  // translate usa coordenadas locais/world dependendo; usamos translate em world
  this.entity.translate(dx, dy, 0);
};

// mantém dentro dos limites
PlayerController.prototype._clampToBounds = function () {
  var p = this.entity.getLocalPosition();
  p.x = pc.math.clamp(p.x, this.boundsMin.x, this.boundsMax.x);
  p.y = pc.math.clamp(p.y, this.boundsMin.y, this.boundsMax.y);
  this.entity.setLocalPosition(p);
};

// obtém AABB world do hitbox do player
PlayerController.prototype.getHitboxAabb = function () {
  var pos = this.entity.getPosition();
  var halfW = this._hitW / 2;
  var halfH = this._hitH / 2;
  return {
    minX: pos.x - halfW,
    maxX: pos.x + halfW,
    minY: pos.y - halfH,
    maxY: pos.y + halfH,
  };
};

// atualiza sprite com base em this._lastDir
PlayerController.prototype._updateSprite = function () {
  if (!this.frameTextures || this.frameTextures.length < 3) return;
  if (!this._material) return;

  var absX = Math.abs(this._lastDir.x);
  var absY = Math.abs(this._lastDir.y);

  var texIdx = 1; // default front index in your bootstrap mapping is [back(0), front(1), side(2)]
  var flip = false;

  if (absX > absY) {
    // horizontal -> side
    texIdx = 2;
    flip = this._lastDir.x < 0;
  } else {
    if (this._lastDir.y > 0) {
      // up -> back
      texIdx = 0;
    } else {
      // down -> front
      texIdx = 1;
    }
  }

  var asset = this.frameTextures[texIdx];
  var tex =
    asset && asset.resource
      ? asset.resource
      : asset instanceof pc.Texture
      ? asset
      : null;
  if (tex) {
    if (this._material.diffuseMap !== tex) {
      this._material.diffuseMap = tex;
      this._material.emissiveMap = tex;
      this._material.update();
    }
  }

  // aplica flip horizontal
  var s = this.entity.getLocalScale();
  this.entity.setLocalScale(flip ? -Math.abs(s.x) : Math.abs(s.x), s.y, s.z);
};
