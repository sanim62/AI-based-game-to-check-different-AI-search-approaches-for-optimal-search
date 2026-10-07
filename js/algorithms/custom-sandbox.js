/**
 * AI Dungeon Duel — Ascension Edition
 * Custom Algorithm Studio & Execution Sandbox
 * Allows users to write, debug, benchmark, and deploy custom JavaScript AI algorithms.
 */

class CustomAlgorithmSandbox {
  constructor() {
    this.combatCustomCode = this.getDefaultCombatCode();
    this.pathCustomCode = this.getDefaultPathCode();
    this.compiledCombatFn = null;
    this.compiledPathFn = null;

    this.loadFromStorage();
    this.compileAll();
  }

  getDefaultCombatCode() {
    return `/**
 * Custom Combat Algorithm
 * @param {Object} ctx
 * @param {Object} ctx.me - Your current hero stats {hp, mp, atk, ult, shield, poisoned, burned, stunned, raging}
 * @param {Object} ctx.enemy - Enemy hero stats
 * @param {Array<string>} ctx.actions - All possible actions ['attack', 'heavy', 'magic', 'drain', 'stun', 'poison', 'rage', 'shield', 'heal', 'ult']
 * @param {Array<string>} ctx.legalActions - Affordable and valid actions this turn
 * @param {Function} ctx.simAct - Clones state and simulates action: simAct(me, enemy, action) -> {a, b, damage}
 * @param {Function} ctx.evalState - Evaluates state score: evalState(me, enemy) -> number
 * @returns {string} One of the action names
 */
function decideAction(ctx) {
  const { me, enemy, legalActions, simAct, evalState } = ctx;

  // 1. If Ultimate is ready, unleash devastation!
  if (me.ult >= 100) {
    return 'ult';
  }

  // 2. Emergency heal if HP drops below 35%
  if (me.hp < 12 && legalActions.includes('heal')) {
    return 'heal';
  }

  // 3. Stun enemy to deny their upcoming turn
  if (!enemy.stunned && legalActions.includes('stun')) {
    return 'stun';
  }

  // 4. Raise shield if taking heavy damage and unprotected
  if (!me.shield && enemy.hp > 15 && legalActions.includes('shield')) {
    return 'shield';
  }

  // 5. Apply poison for sustained damage over 5 turns
  if (!enemy.poisoned && legalActions.includes('poison')) {
    return 'poison';
  }

  // 6. Sustain HP with Life Drain
  if (me.hp < 22 && legalActions.includes('drain')) {
    return 'drain';
  }

  // 7. Otherwise, execute 1-ply lookahead simulation to find highest scoring action!
  let bestScore = -Infinity;
  let bestAction = 'attack';

  for (const act of legalActions) {
    const { a: simulatedMe, b: simulatedEnemy } = simAct(me, enemy, act);
    const score = evalState(simulatedMe, simulatedEnemy);
    if (score > bestScore) {
      bestScore = score;
      bestAction = act;
    }
  }

  return bestAction;
}`;
  }

  getDefaultPathCode() {
    return `/**
 * Custom Pathfinding Algorithm
 * @param {Object} ctx
 * @param {Object} ctx.start - {x, y} start tile
 * @param {Object} ctx.goal - {x, y} target tile
 * @param {Array<Array<number>>} ctx.grid - 2D dungeon grid (0 = floor, 1 = wall)
 * @param {Object} ctx.trapCosts - Known trap hazard penalty map {"x,y": cost}
 * @param {Function} ctx.getNeighbors - Returns walkable neighbors [{x, y, dx, dy}]
 * @param {Function} ctx.manhattan - Distance helper: manhattan(a, b)
 * @returns {Object} { path: [[dx, dy], ...], nodesVisited: number }
 */
function findPath(ctx) {
  const { start, goal, grid, trapCosts, getNeighbors, manhattan } = ctx;
  const key = (x, y) => \`\${x},\${y}\`;

  if (start.x === goal.x && start.y === goal.y) {
    return { path: [], nodesVisited: 0 };
  }

  const open = [{
    x: start.x,
    y: start.y,
    g: 0,
    f: manhattan(start, goal),
    path: []
  }];
  const closed = new Set();
  let nodesVisited = 0;

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const k = key(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      return { path: current.path, nodesVisited };
    }

    if (closed.has(k)) continue;
    closed.add(k);
    nodesVisited++;

    const neighbors = getNeighbors(current.x, current.y);
    for (const nb of neighbors) {
      const nk = key(nb.x, nb.y);
      if (closed.has(nk)) continue;

      // Smart trap avoidance: add heavy penalty for known hazards
      const trapHazard = trapCosts[nk] || 0;
      const g = current.g + 1 + (trapHazard * 2);
      const h = manhattan(nb, goal);

      open.push({
        x: nb.x,
        y: nb.y,
        g,
        f: g + h,
        path: [...current.path, [nb.dx, nb.dy]]
      });
    }
  }

  return { path: null, nodesVisited };
}`;
  }

  getPreset(presetId) {
    const presets = {
      vampiric: `// Preset: Vampiric Siphon & Burn Engine
function decideAction(ctx) {
  const { me, enemy, legalActions } = ctx;
  if (me.ult >= 100) return 'ult';
  if (me.hp < 15 && legalActions.includes('drain')) return 'drain';
  if (!enemy.burned && legalActions.includes('magic')) return 'magic';
  if (!enemy.poisoned && legalActions.includes('poison')) return 'poison';
  if (me.hp < 25 && legalActions.includes('drain')) return 'drain';
  if (legalActions.includes('heavy')) return 'heavy';
  return 'attack';
}`,
      stunner: `// Preset: Electro-Burst Stun Lock
function decideAction(ctx) {
  const { me, enemy, legalActions } = ctx;
  if (me.ult >= 100) return 'ult';
  if (!enemy.stunned && legalActions.includes('stun')) return 'stun';
  // Enemy is stunned! Capitalize with heavy hits and rage
  if (enemy.stunned) {
    if (!me.raging && legalActions.includes('rage')) return 'rage';
    if (legalActions.includes('heavy')) return 'heavy';
    if (legalActions.includes('magic')) return 'magic';
  }
  if (!me.shield && legalActions.includes('shield')) return 'shield';
  return 'attack';
}`,
      turtle: `// Preset: Iron Turtle & Retaliator
function decideAction(ctx) {
  const { me, enemy, legalActions } = ctx;
  if (me.ult >= 100) return 'ult';
  if (!me.shield && legalActions.includes('shield')) return 'shield';
  if (me.hp <= 18 && legalActions.includes('heal')) return 'heal';
  if (!enemy.poisoned && legalActions.includes('poison')) return 'poison';
  if (me.hp < 25 && legalActions.includes('drain')) return 'drain';
  return 'attack';
}`,
      glass_cannon: `// Preset: Pure Berserker Glass Cannon
function decideAction(ctx) {
  const { me, enemy, legalActions } = ctx;
  if (me.ult >= 100) return 'ult';
  if (!me.raging && legalActions.includes('rage')) return 'rage';
  if (legalActions.includes('heavy')) return 'heavy';
  if (legalActions.includes('magic')) return 'magic';
  return 'attack';
}`
    };

    return presets[presetId] || null;
  }

  compileCombat(codeString) {
    try {
      // Build function wrapper
      const wrapped = new Function(
        'ctx',
        `
        ${codeString}
        if (typeof decideAction === 'function') {
          return decideAction(ctx);
        }
        throw new Error("No function named 'decideAction' found.");
      `
      );

      // Dry run test with realistic mock context
      const mockCtx = {
        me: { hp: 20, mp: 6, atk: 8, ult: 30, shield: false, poisoned: false, burned: false, stunned: false, raging: false, statusTurns: {} },
        enemy: { hp: 22, mp: 5, atk: 8, ult: 20, shield: false, poisoned: false, burned: false, stunned: false, raging: false, statusTurns: {} },
        actions: [...ACTIONS],
        legalActions: ['attack', 'heavy', 'magic', 'drain', 'stun', 'poison', 'rage', 'shield', 'heal'],
        simAct: (a, b, act) => combatAIEngine.simAct(a, b, act),
        evalState: (a, b) => combatAIEngine.evalState(a, b)
      };

      const testResult = wrapped(mockCtx);

      if (!testResult || typeof testResult !== 'string' || !ACTIONS.includes(testResult.toLowerCase())) {
        return {
          success: false,
          error: `Function returned invalid action: '${testResult}'. Must return one of: ${ACTIONS.join(', ')}`
        };
      }

      this.combatCustomCode = codeString;
      this.compiledCombatFn = wrapped;
      this.saveToStorage();

      return {
        success: true,
        testedAction: testResult,
        message: `Validation passed! Mock test output: '${testResult.toUpperCase()}'.`
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Syntax error in custom algorithm code.'
      };
    }
  }

  compilePath(codeString) {
    try {
      const wrapped = new Function(
        'ctx',
        `
        ${codeString}
        if (typeof findPath === 'function') {
          return findPath(ctx);
        }
        throw new Error("No function named 'findPath' found.");
      `
      );

      // Dry run test
      const mockCtx = {
        start: { x: 1, y: 1 },
        goal: { x: 3, y: 3 },
        grid: Array.from({ length: 5 }, () => Array(5).fill(0)),
        trapCosts: {},
        getNeighbors: (x, y) => [
          { x: x + 1, y, dx: 1, dy: 0 },
          { x, y: y + 1, dx: 0, dy: 1 }
        ],
        manhattan: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
      };

      const testResult = wrapped(mockCtx);

      if (!testResult || !Array.isArray(testResult.path)) {
        return {
          success: false,
          error: "Pathfinder must return an object with a 'path' array, e.g. { path: [[dx, dy], ...] }."
        };
      }

      this.pathCustomCode = codeString;
      this.compiledPathFn = wrapped;
      this.saveToStorage();

      return {
        success: true,
        message: `Pathfinder validated successfully! Found test path with ${testResult.path.length} steps.`
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Syntax error in custom pathfinder code.'
      };
    }
  }

  compileAll() {
    this.compileCombat(this.combatCustomCode);
    this.compilePath(this.pathCustomCode);
  }

  saveToStorage() {
    try {
      localStorage.setItem('aiduel_custom_combat_code', this.combatCustomCode);
      localStorage.setItem('aiduel_custom_path_code', this.pathCustomCode);
    } catch (e) {}
  }

  loadFromStorage() {
    try {
      const savedCombat = localStorage.getItem('aiduel_custom_combat_code');
      const savedPath = localStorage.getItem('aiduel_custom_path_code');
      if (savedCombat) this.combatCustomCode = savedCombat;
      if (savedPath) this.pathCustomCode = savedPath;
    } catch (e) {}
  }
}

// Global sandbox singleton
const customSandbox = new CustomAlgorithmSandbox();
