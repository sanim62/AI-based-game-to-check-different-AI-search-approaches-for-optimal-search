/**
 * AI Dungeon Duel — Ascension Edition
 * Hero State Management, Attributes, and Metric Tracking
 */

class Hero {
  constructor(options = {}) {
    this.id = options.id || 'hero1';
    this.name = options.name || '⚔ Astra';
    this.x = options.x || 1;
    this.y = options.y || 1;
    this.color = options.color || '#a78bfa';
    this.dark = options.dark || '#4c1d95';
    this.symbol = options.symbol || 'A';
    this.isHuman = !!options.isHuman;

    this.role = options.role || null;
    const roleDef = this.role && HERO_ROLES[this.role] ? HERO_ROLES[this.role] : null;

    // Attributes
    this.maxHp = roleDef ? roleDef.maxHp : (options.maxHp || MAX_HP);
    this.maxMp = options.maxMp || MAX_MP;
    this.maxUlt = options.maxUlt || MAX_ULT;
    this.hp = options.hp !== undefined ? options.hp : this.maxHp;
    this.mp = options.mp !== undefined ? options.mp : this.maxMp;
    this.atk = roleDef ? roleDef.atk : (options.atk || 8);
    this.ult = options.ult || 0;
    this.alive = true;

    // Spec abilities & status
    this.blocked = false;
    this.fireballCooldown = 0;

    // Active Status Effects & Counters
    this.shield = false;
    this.poisoned = false;
    this.burned = false;
    this.stunned = false;
    this.raging = false;

    this.statusTurns = {
      shield: 0,
      poison: 0,
      burn: 0,
      stun: 0,
      rage: 0,
      block: 0
    };

    // Algorithm Assignments
    this.pathAlgoId = options.pathAlgoId || 'astar';
    this.combatAlgoId = options.combatAlgoId || (roleDef ? roleDef.combatAlgo : 'minimax_4');

    // Exploration & Spatial Memory
    this.path = [];
    this.vis = new Set();
    this.explored = new Set();
    this.knownEnemy = null;
    this.lastExploredNodesCount = 0;
    this.lastSearchTree = [];

    // Detailed Benchmark & Ability Metrics
    this.stats = {
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      trapsTriggered: 0,
      trapsAvoided: 0,
      itemsCollected: 0,
      nodesExploredTotal: 0,
      stepsTaken: 0,
      turnsPlayed: 0,
      ultimatesUsed: 0,
      actionDistribution: {},
      totalComputeTimeMs: 0,
      totalDecisions: 0
    };
  }

  reset(x, y) {
    const roleDef = this.role && HERO_ROLES[this.role] ? HERO_ROLES[this.role] : null;
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.atk = roleDef ? roleDef.atk : 8;
    this.ult = 0;
    this.alive = true;
    this.blocked = false;
    this.fireballCooldown = 0;

    this.shield = false;
    this.poisoned = false;
    this.burned = false;
    this.stunned = false;
    this.raging = false;

    this.statusTurns = {
      shield: 0,
      poison: 0,
      burn: 0,
      stun: 0,
      rage: 0,
      block: 0
    };

    this.path = [];
    this.vis = new Set();
    this.explored = new Set();
    this.knownEnemy = null;
    this.lastExploredNodesCount = 0;
    this.lastSearchTree = [];
  }

  resetAllStats() {
    this.stats = {
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      trapsTriggered: 0,
      trapsAvoided: 0,
      itemsCollected: 0,
      nodesExploredTotal: 0,
      stepsTaken: 0,
      turnsPlayed: 0,
      ultimatesUsed: 0,
      actionDistribution: {},
      totalComputeTimeMs: 0,
      totalDecisions: 0
    };
  }

  recordDecision(action, computeMs = 0) {
    this.stats.totalDecisions++;
    this.stats.totalComputeTimeMs += computeMs;
    this.stats.actionDistribution[action] = (this.stats.actionDistribution[action] || 0) + 1;
    if (action === 'ult') this.stats.ultimatesUsed++;
  }

  cloneForSim() {
    return {
      name: this.name,
      role: this.role,
      maxHp: this.maxHp,
      hp: this.hp,
      mp: this.mp,
      atk: this.atk,
      ult: this.ult,
      blocked: this.blocked,
      fireballCooldown: this.fireballCooldown,
      shield: this.shield,
      poisoned: this.poisoned,
      burned: this.burned,
      stunned: this.stunned,
      raging: this.raging,
      statusTurns: { ...this.statusTurns }
    };
  }
}

function createHero(options = {}) {
  return new Hero(options);
}
