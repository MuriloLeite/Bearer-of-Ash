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
// escala da área de visão
EnemyAI.attributes.add("visionScale", {
  type: "number",
  default: 8.0,
  title: "Vision Cone Scale",
});

EnemyAI.prototype.initialize = function () {
  this._state = "wander";
  this._wanderTimer = 0;
  this._targetPos = this._randomPoint();
  this._player = this.app.root.findByName("Player");
  this._lastMoveDir = new pc.Vec3(1, 0, 0);
  this._currentDirection = "right"; // front, back, left, right

  // texturas do inimigo
  this.frameTextures = window.GAME_TEXTURES?.enemy || [];

  // material do inimigo
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

  // CRIAR ENTIDADE VISION (plane)
  this._vision = new pc.Entity(this.entity.name + "_vision");
  this._vision.addComponent("render", { type: "plane" });
  this._vision.reparent(this.entity);
  this._vision.setLocalPosition(0, 0, 0.01);
  this._vision.enabled = true;

  // Material de visão (cone amarelo semi-transparente)
  this._visionMat = new pc.StandardMaterial();
  this._visionMat.useLighting = false;
  this._visionMat.blendType = pc.BLEND_NORMAL;
  this._visionMat.opacity = 0.45;
  this._visionMat.emissive = new pc.Color(1, 1, 0); // amarelo
  this._visionMat.emissiveIntensity = 0.8;
  this._visionMat.update();
  this._vision.render.meshInstances[0].material = this._visionMat;

  // Carregar texturas de visão (verifica se existem)
  this._visionAssets = {
    front: window.GAME_TEXTURES?.vision?.[1],
    back: window.GAME_TEXTURES?.vision?.[0],
    side: window.GAME_TEXTURES?.vision?.[2],
  };

  // Se não houver texturas, cria cone amarelo simples
  if (!this._visionAssets.front && !this._visionAssets.back && !this._visionAssets.side) {
    console.log("⚠️ Vision textures not found, using solid color cone");
    this._useSimpleCone = true;
  }

  // hitbox sizes
  this._hitW = this.hitboxSize.x;
  this._hitH = this.hitboxSize.y;

  // cooldown para múltiplos hits
  this._lastHitTime = 0;
  this._hitCooldown = 0.8;

  // contador global de hits
  if (window.PLAYER_HITS === undefined) window.PLAYER_HITS = 0;
};

// cria/retorna asset
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

  // detect player in sight
  if (this._isPlayerInSight()) {
    this._state = "chase";
    this._targetPos = this._player.getPosition().clone();
  } else if (this._state === "chase") {
    // hysteresis: if lost, return to wander
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

// movement toward target
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

// verifica se player está dentro do cone de visão
EnemyAI.prototype._isPlayerInSight = function () {
  if (!this._player) return false;
  var myPos = this.entity.getPosition();
  var playerPos = this._player.getPosition();
  var v = new pc.Vec3(playerPos.x - myPos.x, playerPos.y - myPos.y, 0);
  var dist = Math.sqrt(v.x * v.x + v.y * v.y);
  if (dist > this.sightDistance) return false;

  // forward = last move direction
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

// atualiza sprite do corpo e cone de visão
EnemyAI.prototype._updateSpriteAndVision = function () {
  var dir = this._lastMoveDir || new pc.Vec3(1, 0, 0);
  if (dir.lengthSq() === 0) dir.set(1, 0, 0);
  var absX = Math.abs(dir.x),
    absY = Math.abs(dir.y);

  var texIdx = 1; // default front
  var flip = false;
  var visionKey = "side";
  var angle = 0; // rotação do cone

  if (absX > absY) {
    // horizontal
    texIdx = 2; // side
    flip = dir.x < 0;
    visionKey = "side";
    this._currentDirection = dir.x > 0 ? "right" : "left";
    angle = dir.x > 0 ? -90 : 90; // cone aponta para direita ou esquerda
  } else {
    if (dir.y > 0) {
      texIdx = 0; // back
      visionKey = "back";
      this._currentDirection = "back";
      angle = 0; // cone aponta para cima
    } else {
      texIdx = 1; // front
      visionKey = "front";
      this._currentDirection = "front";
      angle = 180; // cone aponta para baixo
    }
  }

  // aplica textura no corpo
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

  // aplica textura de visão
  var vAsset = this._visionAssets[visionKey];
  var vTex = vAsset || null;
  if (vTex) {
    if (this._visionMat.diffuseMap !== vTex) {
      this._visionMat.diffuseMap = vTex;
      this._visionMat.emissiveMap = vTex;
      this._visionMat.update();
    }

    // escala do cone de visão
    var scale = this.visionScale;
    this._vision.setLocalScale(scale, scale, 1);
  }

  // IMPORTANTE: Rotaciona o cone para apontar na direção do movimento
  this._vision.setLocalEulerAngles(0, 0, angle);
  
  // Posiciona o cone à frente do inimigo
  var offset = this.sightDistance * 0.4; // distância do centro do cone
  var offsetX = 0, offsetY = 0;
  
  switch(this._currentDirection) {
    case "front":
      offsetY = -offset;
      break;
    case "back":
      offsetY = offset;
      break;
    case "right":
      offsetX = offset;
      break;
    case "left":
      offsetX = -offset;
      break;
  }
  
  this._vision.setLocalPosition(offsetX, offsetY, 0.01);
  
  // Muda cor do cone quando perseguindo
  if (this._state === "chase") {
    this._visionMat.emissive = new pc.Color(1, 0, 0); // vermelho
    this._visionMat.opacity = 0.6;
  } else {
    this._visionMat.emissive = new pc.Color(1, 1, 0); // amarelo
    this._visionMat.opacity = 0.45;
  }
  this._visionMat.update();
};

// retorna AABB do inimigo
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

// checa colisão AABB simples com player
EnemyAI.prototype.checkCollisionWithPlayer = function () {
  const player = this.app.root.findByName("Player");
  if (!player) return;

  // AABB do inimigo
  const eBox = this.getHitboxAabb();

  // AABB do player
  const pPos = player.getPosition();
  const pHalfW = 0.4;
  const pHalfH = 0.5;
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