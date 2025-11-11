/*
  gameManager.js
  - Global game state and difficulty
  - Tracks torches, spawns enemies, controls win/lose
  - Updates HUD via events to uiManager
  - Scene flow can be coordinated with uiManager
*/

var GameManager = pc.createScript('gameManager');

// Difficulty selection: Easy, Normal, Hard
GameManager.attributes.add('difficulty', { type: 'string', enum: [
    { 'Easy': 'Easy' }, { 'Normal': 'Normal' }, { 'Hard': 'Hard' }
], default: 'Normal', title: 'Start Difficulty' });

// Player, Altar, UI
GameManager.attributes.add('player', { type: 'entity', title: 'Player' });
GameManager.attributes.add('altar', { type: 'entity', title: 'Altar' });
GameManager.attributes.add('uiManager', { type: 'entity', title: 'UI Manager' });

// Enemy spawn setup
GameManager.attributes.add('enemyPrefab', { type: 'entity', title: 'Enemy Prefab (disabled template entity)' });
GameManager.attributes.add('spawnPoints', { type: 'entity', array: true, title: 'Spawn Points' });

// Torch discovery (auto by tag "torch")
GameManager.attributes.add('torchTag', { type: 'string', default: 'torch', title: 'Torch Tag' });

// Win/Lose
GameManager.attributes.add('requireAllLitForWin', { type: 'boolean', default: true, title: 'Win When All Lit' });
GameManager.attributes.add('victoryHoldSeconds', { type: 'number', default: 5.0, title: 'Hold All Lit For (s)' });

// Internal difficulty table (could be a separate script/module)
// Values are examples you can tune in the Editor if you expose them.
GameManager.prototype._getDifficultyTable = function () {
    return {
        Easy:   { enemySpeed: 1.6, detectRange: 6,  spawnInterval: 10, maxEnemies: 4, extinguishTime: 3.0 },
        Normal: { enemySpeed: 2.1, detectRange: 8,  spawnInterval: 7,  maxEnemies: 6, extinguishTime: 2.2 },
        Hard:   { enemySpeed: 2.7, detectRange: 10, spawnInterval: 5,  maxEnemies: 8, extinguishTime: 1.6 }
    };
};

GameManager.prototype.initialize = function () {
    // Persisted difficulty from menu (optional)
    try {
        var saved = pc.platform.browser && window && window.localStorage.getItem('ash:difficulty');
        if (saved) this.difficulty = saved;
    } catch(e) {}

    // State
    this._state = 'playing'; // playing | paused | victory | defeat
    this._difficultyParams = this._getDifficultyTable()[this.difficulty] || this._getDifficultyTable().Normal;
    this._torchEntities = [];
    this._litCount = 0;
    this._totalTorches = 0;

    // Register event listeners
    this.app.on('torch:lit', this._onTorchLit, this);
    this.app.on('torch:unlit', this._onTorchUnlit, this);
    this.app.on('game:pause', this._onPause, this);
    this.app.on('game:resume', this._onResume, this);
    this.app.on('game:restart', this._onRestart, this);
    this.app.on('game:reset', this.resetGame, this);
    this.app.on('game:victory', this._onVictory, this);
    this.app.on('game:defeat', this._onDefeat, this);

    // Discover torches by tag
    this._collectTorches();

    // Apply initial HUD
    this._updateHUD();

    // Enemy spawn loop
    this._enemies = [];
    this._spawnTimer = 0;

    // Inform altar about total count
    this._updateAltar();
};

GameManager.prototype.onDestroy = function () {
    this.app.off('torch:lit', this._onTorchLit, this);
    this.app.off('torch:unlit', this._onTorchUnlit, this);
    this.app.off('game:pause', this._onPause, this);
    this.app.off('game:resume', this._onResume, this);
    this.app.off('game:restart', this._onRestart, this);
    this.app.off('game:victory', this._onVictory, this);
    this.app.off('game:defeat', this._onDefeat, this);
};

GameManager.prototype._collectTorches = function () {
    var tagged = this.app.root.findByTag(this.torchTag);
    this._torchEntities = tagged || [];
    this._totalTorches = this._torchEntities.length;
    // compute lit count
    this._litCount = 0;
    for (var i = 0; i < this._torchEntities.length; i++) {
        var t = this._torchEntities[i];
        var ts = t.script && t.script.torch;
        if (ts && ts.isLit()) this._litCount++;
    }
};

GameManager.prototype._onTorchLit = function (torchScript) {
    this._litCount++;
    this._updateHUD();
    this._updateAltar();

    if (this.requireAllLitForWin) {
        // Start victory hold check
        if (this._litCount >= this._totalTorches && this._totalTorches > 0) {
            var self = this;
            // schedule a check after hold seconds
            this._victoryCheckTime = this.victoryHoldSeconds;
            this._pendingVictory = true;
        }
    }
};

GameManager.prototype._onTorchUnlit = function (torchScript) {
    this._litCount = Math.max(0, this._litCount - 1);
    this._pendingVictory = false;
    this._updateHUD();
    this._updateAltar();

    if (this._litCount === 0 && this._totalTorches > 0) {
        this._onDefeat();
    }
};

GameManager.prototype._updateAltar = function () {
    if (this.altar && this.altar.script && this.altar.script.altar) {
        this.app.fire('altar:update', this._litCount, this._totalTorches);
    }
};

GameManager.prototype._updateHUD = function () {
    this.app.fire('hud:update', {
        lit: this._litCount,
        total: this._totalTorches,
        difficulty: this.difficulty,
        enemies: this._enemies ? this._enemies.length : 0
    });
};

GameManager.prototype._onPause = function () { this._state = 'paused'; };
GameManager.prototype._onResume = function () { this._state = 'playing'; };
GameManager.prototype._onRestart = function () {
    // Engine-only: reset world state
    this.resetGame();
    this.app.fire('game:resume');
};

GameManager.prototype._onVictory = function () {
    if (this._state === 'victory') return;
    this._state = 'victory';
    this.app.fire('game:state', { state: 'victory' });
    this.app.fire('game:pause');
};

GameManager.prototype._onDefeat = function () {
    if (this._state === 'defeat') return;
    this._state = 'defeat';
    this.app.fire('game:state', { state: 'defeat' });
    this.app.fire('game:pause');
};

GameManager.prototype.update = function (dt) {
    if (this._state !== 'playing') return;

    // Victory hold check
    if (this._pendingVictory) {
        this._victoryCheckTime -= dt;
        if (this._victoryCheckTime <= 0) {
            // verify still all lit
            var allLit = true;
            for (var i = 0; i < this._torchEntities.length; i++) {
                var ts = this._torchEntities[i].script && this._torchEntities[i].script.torch;
                if (!ts || !ts.isLit()) { allLit = false; break; }
            }
            if (allLit) {
                this._onVictory();
            }
            this._pendingVictory = false;
        }
    }

    // Spawn enemies
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
        this._spawnTimer = this._difficultyParams.spawnInterval;
        if (this._enemies.length < this._difficultyParams.maxEnemies) {
            this._spawnEnemy();
            this._updateHUD(); // Atualiza contador de inimigos
        }
    }
};

GameManager.prototype._spawnEnemy = function () {
    if (!this.enemyPrefab) return;
    var sp = null;
    if (this.spawnPoints && this.spawnPoints.length > 0) {
        sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    }
    var pos = sp ? sp.getPosition().clone() : this.entity.getPosition().clone();
    var clone = this.enemyPrefab.clone();
    clone.enabled = true;
    this.entity.addChild(clone);
    clone.setPosition(pos);

    // Ensure enemy has EnemyAI and reference back to GM
    if (!clone.script || !clone.script.enemyAI) {
        if (!clone.script) clone.addComponent('script');
        clone.script.create('enemyAI');
    }
    if (clone.script && clone.script.enemyAI) {
        clone.script.enemyAI.gameManager = this.entity;
        // pass current difficulty params
        clone.script.enemyAI.extinguishTime = this._difficultyParams.extinguishTime;
    }

    this._enemies.push(clone);
    
    // Register enemy as collidable for other enemies and player
    this.app.fire('collision:register', clone, 0.6);
};

GameManager.prototype.resetGame = function () {
    // Re-read difficulty from localStorage if provided
    try {
        var saved = pc.platform.browser && window && window.localStorage.getItem('ash:difficulty');
        if (saved) this.difficulty = saved;
    } catch(e) {}
    this._difficultyParams = this._getDifficultyTable()[this.difficulty] || this._getDifficultyTable().Normal;

    // Destroy spawned enemies
    if (this._enemies) {
        for (var i = 0; i < this._enemies.length; i++) {
            if (this._enemies[i] && this._enemies[i].destroy) this._enemies[i].destroy();
        }
    }
    this._enemies = [];
    this._spawnTimer = 0;

    // Reset torches
    this._collectTorches();
    for (var t = 0; t < this._torchEntities.length; t++) {
        var te = this._torchEntities[t];
        var ts = te.script && te.script.torch;
        if (ts) {
            ts.setLit(!!ts.startLit);
        }
    }
    // Recount lit
    this._litCount = 0;
    for (var j = 0; j < this._torchEntities.length; j++) {
        var ts2 = this._torchEntities[j].script && this._torchEntities[j].script.torch;
        if (ts2 && ts2.isLit()) this._litCount++;
    }
    this._pendingVictory = false;
    this._updateHUD();
    this._updateAltar();
};
