// enemyAI.js
// Wander + visão com sprite + hitbox AABB que conta 4 hits até Game Over

var EnemyAI = pc.createScript("enemyAI");

EnemyAI.attributes.add("speedWander", { type: "number", default: 1.0 });
EnemyAI.attributes.add("speedChase", { type: "number", default: 2.2 });
EnemyAI.attributes.add("sightDistance", { type: "number", default: 8 });
EnemyAI.attributes.add("sightAngleDeg", { type: "number", default: 120 });
EnemyAI.attributes.add("boundsMin", { type: "vec2", default: [-11, -11] });
EnemyAI.attributes.add("boundsMax", { type: "vec2", default: [11, 11] });
EnemyAI.attributes.add("wanderChangeInterval", {
  type: "number",
  default: 2.5,
});
// tamanho do hitbox do inimigo
EnemyAI.attributes.add("hitboxSize", {
  type: "vec2",
  default: [1.0, 1.2],
  title: "Hitbox Size (w,h)",
});

EnemyAI.prototype.initialize = function () {
  this._state = "wander";
  this._wanderTimer = 0;
  this._targetPos = this._randomPoint();
  this._player = this.app.root.findByName("Player");
  this._lastMoveDir = new pc.Vec3(1, 0, 0);

  // texturas do inimigo (espera window.GAME_TEXTURES.enemy = [back(0), front(1), side(2)])
  this.frameTextures = window.GAME_TEXTURES?.enemy || [];

  // material do inimigo (fallback)
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

  // CRIAR ENTIDADE VISION (plane) e carregar sprites de vision
  this._vision = new pc.Entity(this.entity.name + "_vision");
  this._vision.addComponent("render", { type: "plane" });
  this._vision.reparent(this.entity);
  this._vision.setLocalPosition(0, 0, 0.01);

  // prepararemos materiais de visão quando os assets estiverem prontos
  this._visionMat = new pc.StandardMaterial();
  this._visionMat.useLighting = false;
  this._visionMat.blendType = pc.BLEND_NORMAL;
  this._visionMat.opacity = 0.45;
  this._visionMat.update();
  this._vision.render.meshInstances[0].material = this._visionMat;

  // pré-carrega as texturas de visão (assets)
  this._visionAssets = {
    front: this._ensureAsset("game_assets/enemy/enemy_vision_front.png"),
    back: this._ensureAsset("game_assets/enemy/enemy_vision_back.png"),
    side: this._ensureAsset("game_assets/enemy/enemy_vision_side.png"),
  };

  // hitbox sizes
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;

  // cooldown para múltiplos hits do mesmo inimigo
  this._lastHitTime = 0;
  this._hitCooldown = 0.8; // segundos

  // contador global de hits se não existir
  if (window.PLAYER_HITS === undefined) window.PLAYER_HITS = 0;
};

// cria/retorna asset (não duplicar se já existe)
EnemyAI.prototype._ensureAsset = function (url) {
  var existing = this.app.assets.find(url);
  if (existing) return existing;
  var a = new pc.Asset(url, "texture", { url: url });
  this.app.assets.add(a);
  this.app.assets.load(a);
  return a;
};

// pick random point within bounds
EnemyAI.prototype._randomPoint = function () {
  var min = this.boundsMin,
    max = this.boundsMax;
  var x = min.x + Math.random() * (max.x - min.x);
  var y = min.y + Math.random() * (max.y - min.y);
  return new pc.Vec3(x, y, 0);
};

EnemyAI.prototype.update = function (dt) {
  if (!this._player) {
    this._player = this.app.root.findByName("Player");
    if (!this._player) return;
  }

  // wander change
  this._wanderTimer -= dt;
  if (this._wanderTimer <= 0 && this._state === "wander") {
    this._targetPos = this._randomPoint();
    this._wanderTimer =
      this.wanderChangeInterval + Math.random() * this.wanderChangeInterval;
  }

  // detect player in sight (distance + angle)
  if (this._isPlayerInSight()) {
    this._state = "chase";
    this._targetPos = this._player.getPosition().clone();
  } else if (this._state === "chase") {
    // small hysteresis: if lost, return to wander after some time
    if (!this._chaseLoseTimer) this._chaseLoseTimer = 0.8;
    this._chaseLoseTimer -= dt;
    if (this._chaseLoseTimer <= 0) {
      this._state = "wander";
      this._chaseLoseTimer = 0;
    }
  }

  // move
  var speed = this._state === "chase" ? this.speedChase : this.speedWander;
  this._moveToward(this._targetPos, speed, dt);

  // sprite + vision update
  this._updateSpriteAndVision();

  // check hitbox collision with player
  this.checkCollisionWithPlayer();
};

// movement toward target (also sets _lastMoveDir)
EnemyAI.prototype._moveToward = function (target, speed, dt) {
  var cur = this.entity.getPosition();
  var dir = new pc.Vec3(target.x - cur.x, target.y - cur.y, 0);
  var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  if (len < 0.001) return;
  dir.x /= len;
  dir.y /= len;
  this._lastMoveDir = dir.clone();

  // translate
  this.entity.translate(dir.x * speed * dt, dir.y * speed * dt, 0);

  // clamp to bounds
  var p = this.entity.getLocalPosition();
  p.x = pc.math.clamp(p.x, this.boundsMin.x, this.boundsMax.x);
  p.y = pc.math.clamp(p.y, this.boundsMin.y, this.boundsMax.y);
  this.entity.setLocalPosition(p);
};

// verifica se player está dentro do cone de visão (apenas distância + ângulo)
EnemyAI.prototype._isPlayerInSight = function () {
  if (!this._player) return false;
  var myPos = this.entity.getPosition();
  var playerPos = this._player.getPosition();
  var v = new pc.Vec3(playerPos.x - myPos.x, playerPos.y - myPos.y, 0);
  var dist = Math.sqrt(v.x * v.x + v.y * v.y);
  if (dist > this.sightDistance) return false;

  // forward = last move direction se existir, senão +X
  var forward =
    this._lastMoveDir && this._lastMoveDir.lengthSq() > 0
      ? this._lastMoveDir.clone()
      : new pc.Vec3(1, 0, 0);
  forward.normalize();
  v.normalize();
  var dot = forward.x * v.x + forward.y * v.y;
  dot = Math.max(-1, Math.min(1, dot));
  var angleDeg = Math.acos(dot) * (180 / Math.PI);
  return angleDeg <= this.sightAngleDeg * 0.5;
};

// atualiza sprite do corpo e sprite do vision conforme direção
EnemyAI.prototype._updateSpriteAndVision = function () {
  var dir = this._lastMoveDir || new pc.Vec3(1, 0, 0);
  if (dir.lengthSq() === 0) dir.set(1, 0, 0);
  var absX = Math.abs(dir.x),
    absY = Math.abs(dir.y);

  var texIdx = 1; // default front
  var flip = false;
  var visionKey = "side";

  if (absX > absY) {
    // horizontal
    texIdx = 2; // side
    flip = dir.x < 0;
    visionKey = "side";
  } else {
    if (dir.y > 0) {
      texIdx = 0; // back
      visionKey = "back";
    } else {
      texIdx = 1; // front
      visionKey = "front";
    }
  }

  // aplica textura no corpo (frameTextures pode ter assets com .resource)
  var asset = this.frameTextures && this.frameTextures[texIdx];
  var tex = asset
    ? asset.resource
      ? asset.resource
      : asset instanceof pc.Texture
      ? asset
      : null
    : null;
  if (tex && this._material) {
    if (this._material.diffuseMap !== tex) {
      this._material.diffuseMap = tex;
      this._material.emissiveMap = tex;
      this._material.update();
    }
  }

  // flip
  var s = this.entity.getLocalScale();
  this.entity.setLocalScale(flip ? -Math.abs(s.x) : Math.abs(s.x), s.y, s.z);

  // aplica visão (se asset carregado)
  var vAsset = this._visionAssets[visionKey];
  var vTex = vAsset && vAsset.resource ? vAsset.resource : null;
  if (vTex) {
    if (this._visionMat.diffuseMap !== vTex) {
      this._visionMat.diffuseMap = vTex;
      this._visionMat.emissiveMap = vTex;
      this._visionMat.update();
    }

    // escalar o cone de visão conforme o tamanho real do sprite
    const texW = vTex.width / 100; // fator de escala (ajuste conforme necessário)
    const texH = vTex.height / 100;
    this._vision.setLocalScale(texW, texH, 1);
  }

  // posiciona visão um pouco à frente do inimigo (no mundo local)
  var offset = dir.clone().normalize().scale(1.0);
  this._vision.setLocalPosition(offset.x, offset.y, 0.01);
};

// retorna AABB do inimigo (world)
EnemyAI.prototype.getHitboxAabb = function () {
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

// checa colisão AABB simples com player e contabiliza hits
EnemyAI.prototype.checkCollisionWithPlayer = function () {
  const player = this.app.root.findByName("Player");
  if (!player) return;

  // AABB do inimigo
  const eBox = this.getHitboxAabb();

  // AABB do player (gera automaticamente com base no tamanho do sprite)
  const pPos = player.getPosition();
  const pHalfW = 0.4; // metade da largura aproximada do sprite
  const pHalfH = 0.5; // metade da altura aproximada do sprite
  const pBox = {
    minX: pPos.x - pHalfW,
    maxX: pPos.x + pHalfW,
    minY: pPos.y - pHalfH,
    maxY: pPos.y + pHalfH,
  };

  // colisão AABB
  const isColliding = !(
    eBox.maxX < pBox.minX ||
    eBox.minX > pBox.maxX ||
    eBox.maxY < pBox.minY ||
    eBox.minY > pBox.maxY
  );

  const now = Date.now();
  if (isColliding && now - this._lastHitTime > this._hitCooldown * 1000) {
    this._lastHitTime = now;

    if (window.PLAYER_HITS == null) window.PLAYER_HITS = 0;
    window.PLAYER_HITS++;
    console.log(`💥 Player hit by enemy! Hits: ${window.PLAYER_HITS} / 4`);

    if (window.PLAYER_HITS >= 4) {
      console.log("💀 GAME OVER - Player defeated!");
      this.triggerGameOver();
    }
  }
};

EnemyAI.prototype.triggerGameOver = function () {
  if (this._gameOverTriggered) return;
  this._gameOverTriggered = true;

  this.app.timeScale = 0;

  const gameOverDiv = document.createElement("div");
  gameOverDiv.innerHTML =
    "<h1 style='color:red;font-size:48px;text-align:center;margin-top:40vh;'>GAME OVER</h1>";
  gameOverDiv.style.position = "fixed";
  gameOverDiv.style.top = "0";
  gameOverDiv.style.left = "0";
  gameOverDiv.style.width = "100%";
  gameOverDiv.style.height = "100%";
  gameOverDiv.style.background = "rgba(0,0,0,0.7)";
  gameOverDiv.style.zIndex = "9999";
  document.body.appendChild(gameOverDiv);
};
