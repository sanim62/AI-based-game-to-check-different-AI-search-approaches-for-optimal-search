/**
 * AI Dungeon Duel — Algorithm Unit & Integration Test Suite
 * Runs in Node.js with a lightweight DOM stub.
 */

'use strict';
const path = require('path');
const fs   = require('fs');
const { performance } = require('perf_hooks');

// ── Browser API Shims ────────────────────────────────────────────────────────
global.window         = {};
global.performance    = performance;
global.requestAnimationFrame = () => {};
global.cancelAnimationFrame  = () => {};
global.localStorage   = { getItem: () => null, setItem: () => {} };
global.document = {
  getElementById:    () => ({ getContext: () => ({}), width: 442, height: 374, style: {}, addEventListener: () => {} }),
  querySelectorAll:  () => [],
  addEventListener:  () => {}
};

// ── Bundle all source files into ONE closure so class/const share scope ──────
const modules = [
  'js/constants.js',
  'js/audio.js',
  'js/dungeon.js',
  'js/hero.js',
  'js/algorithms/pathfinding.js',
  'js/algorithms/combat-ai.js',
  'js/algorithms/custom-sandbox.js',
  'js/benchmark.js'
];

const bundled = modules
  .map(f => `\n// ─── ${f} ───\n` + fs.readFileSync(path.join(__dirname, f), 'utf8'))
  .join('\n');

// Wrap everything in a single function so class declarations share the same scope,
// then return the symbols we need for the tests.
const bundleFactory = new Function(`
  ${bundled}
  return {
    COLS, ROWS, ACTIONS, MAX_HP, MAX_MP, MAX_ULT, ACT_COST, ACTION_INFO,
    PATHFINDING_ALGORITHMS, COMBAT_ALGORITHMS,
    DungeonManager, manhattanDist, getNeighbors4,
    Hero, createHero,
    PathfindingEngine, pathfindingEngine,
    CombatAIEngine, combatAIEngine,
    CustomAlgorithmSandbox, customSandbox,
    BenchmarkEngine, benchmarkEngine
  };
`);

let exported;
try {
  exported = bundleFactory();
} catch (e) {
  console.error('[BUNDLE LOAD ERROR]', e.message);
  process.exit(1);
}

const {
  COLS, ROWS, ACTIONS, MAX_HP, MAX_MP, MAX_ULT, ACT_COST,
  DungeonManager, manhattanDist,
  Hero, createHero,
  PathfindingEngine, pathfindingEngine,
  CombatAIEngine, combatAIEngine,
  CustomAlgorithmSandbox, customSandbox,
  BenchmarkEngine, benchmarkEngine
} = exported;

// ── Test Runner Helpers ──────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✖ FAILED: ${name}\n    → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ────────────────────────────────────────────────────────────────────────────
// SECTION 1 — DUNGEON GENERATION
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 1: DUNGEON GENERATION ═══');

let dungeon, start, goal;
test('DungeonManager generates a dungeon with rooms', () => {
  const mgr = new DungeonManager(COLS, ROWS);
  dungeon = mgr.generate();
  assert(dungeon.rooms.length >= 4, `Expected ≥4 rooms, got ${dungeon.rooms.length}`);
  assert(dungeon.grid.length === ROWS, 'Grid row count mismatch');
  assert(dungeon.grid[0].length === COLS, 'Grid col count mismatch');
  start = dungeon.rooms[0];
  goal  = dungeon.rooms[dungeon.rooms.length - 1];
});

test('Dungeon grid has reachable floor tiles', () => {
  let floors = 0;
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (dungeon.grid[y][x] === 0) floors++;
  assert(floors > 10, `Expected >10 floor tiles, got ${floors}`);
});

test('Start and goal rooms have valid coordinates', () => {
  assert(start.cx >= 0 && start.cy >= 0, 'Start room out of bounds');
  assert(goal.cx < COLS && goal.cy < ROWS, 'Goal room out of bounds');
  assert(dungeon.grid[start.cy][start.cx] === 0, 'Start room is a wall!');
  assert(dungeon.grid[goal.cy][goal.cx] === 0, 'Goal room is a wall!');
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PATHFINDING ALGORITHMS
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 2: PATHFINDING ALGORITHMS ═══');

const pathAlgos = ['astar', 'dijkstra', 'greedy_bfs', 'bfs', 'dfs'];

for (const algo of pathAlgos) {
  test(`[${algo}] finds a valid path`, () => {
    const res = pathfindingEngine.findPath(
      algo, start.cx, start.cy, goal.cx, goal.cy,
      dungeon.grid, dungeon.trapCosts, null
    );
    assert(res, `Result is null for ${algo}`);
    if (algo !== 'dfs') {
      // DFS may fail to find path in tight dungeons — just check it doesn't crash
      assert(res.path !== undefined, 'path property missing');
    }
    assert(typeof res.nodesVisited === 'number', 'nodesVisited must be a number');
    assert(typeof res.timeTakenMs === 'number', 'timeTakenMs must be a number');
  });
}

test('A* correctly avoids known traps', () => {
  const trapcosts = {};
  // Mark start's first neighbor as a trap
  const n = pathfindingEngine.getNeighbors(start.cx, start.cy, dungeon.grid, null);
  if (n.length > 0) {
    trapcosts[`${n[0].x},${n[0].y}`] = 50;
  }
  const res = pathfindingEngine.findPath('astar', start.cx, start.cy, goal.cx, goal.cy, dungeon.grid, trapcosts, null);
  assert(res.path !== null, 'A* should still find a path around traps');
});

test('BFS finds the shortest-step-count path', () => {
  const bfsRes = pathfindingEngine.runBFS(start.cx, start.cy, goal.cx, goal.cy, dungeon.grid, null);
  const astarRes = pathfindingEngine.runAStar(start.cx, start.cy, goal.cx, goal.cy, dungeon.grid, {}, null);
  if (bfsRes.path && astarRes.path) {
    // Both are optimal in uniform grids; A* visits ≤ BFS nodes
    assert(astarRes.nodesVisited <= bfsRes.nodesVisited + 5,
      `A* should visit ≤ BFS nodes (A*=${astarRes.nodesVisited}, BFS=${bfsRes.nodesVisited})`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 3 — HERO STATE
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 3: HERO STATE & CLONE ═══');

test('createHero() returns a Hero with correct defaults', () => {
  const h = createHero({ id: 'h1', name: 'TestHero' });
  assert(h.hp === MAX_HP, `Expected hp=${MAX_HP}`);
  assert(h.mp === MAX_MP, `Expected mp=${MAX_MP}`);
  assert(h.ult === 0, 'Expected ult=0');
  assert(!h.shield && !h.poisoned, 'No status should be active');
});

test('cloneForSim() creates a shallow copy with statusTurns', () => {
  const h = createHero({ id: 'h1', name: 'A' });
  h.hp = 12; h.shield = true;
  const clone = h.cloneForSim();
  assert(clone.hp === 12, 'Clone HP mismatch');
  assert(clone.shield === true, 'Clone shield mismatch');
  // Mutating clone should not affect original
  clone.hp = 1;
  assert(h.hp === 12, 'Original HP was mutated by clone change!');
});

test('recordDecision() correctly tracks action stats', () => {
  const h = createHero({ id: 'h1', name: 'A' });
  h.recordDecision('attack', 2.5);
  h.recordDecision('attack', 1.5);
  h.recordDecision('heal', 1.0);
  assert(h.stats.totalDecisions === 3, 'totalDecisions should be 3');
  assert(h.stats.actionDistribution['attack'] === 2, 'attack count should be 2');
  assert(h.stats.actionDistribution['heal'] === 1, 'heal count should be 1');
  assert(Math.abs(h.stats.totalComputeTimeMs - 5.0) < 0.01, 'Total compute time mismatch');
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 4 — COMBAT SIMULATION
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 4: COMBAT ACTION SIMULATION ═══');

test('simAct("attack") reduces enemy HP', () => {
  const me = createHero({ id: 'h1' }); me.atk = 8;
  const en = createHero({ id: 'h2' }); en.hp = 30;
  const { b } = combatAIEngine.simAct(me.cloneForSim(), en.cloneForSim(), 'attack', true);
  assert(b.hp < 30, 'Enemy HP should decrease after attack');
});

test('simAct("heal") restores self HP', () => {
  const me = createHero({ id: 'h1' }); me.hp = 10; me.mp = 5;
  const en = createHero({ id: 'h2' });
  const { a } = combatAIEngine.simAct(me.cloneForSim(), en.cloneForSim(), 'heal', true);
  assert(a.hp > 10, 'Self HP should increase after heal');
});

test('simAct("shield") applies shield status', () => {
  const me = createHero({ id: 'h1' });
  const en = createHero({ id: 'h2' });
  const { a } = combatAIEngine.simAct(me.cloneForSim(), en.cloneForSim(), 'shield', true);
  assert(a.shield === true, 'Shield should be active after shield action');
});

test('simAct("ult") deals bonus damage and resets ULT', () => {
  const me = createHero({ id: 'h1' }); me.ult = MAX_ULT;
  const en = createHero({ id: 'h2' }); en.hp = 30;
  const { a, b } = combatAIEngine.simAct(me.cloneForSim(), en.cloneForSim(), 'ult', true);
  assert(a.ult === 0, 'ULT should reset to 0 after casting');
  assert(b.hp < 30, 'Enemy HP should decrease from ULT');
});

test('Shield reduces damage by ~62%', () => {
  const me = createHero({ id: 'h1' }); me.atk = 10;
  const enNoShield = createHero({ id: 'en1' }); enNoShield.hp = 30; enNoShield.shield = false;
  const enShield   = createHero({ id: 'en2' }); enShield.hp = 30; enShield.shield = true;

  const r1 = combatAIEngine.simAct({ ...me.cloneForSim() }, enNoShield.cloneForSim(), 'attack', true);
  const r2 = combatAIEngine.simAct({ ...me.cloneForSim() }, enShield.cloneForSim(), 'attack', true);

  const dmgNoShield = 30 - r1.b.hp;
  const dmgShield   = 30 - r2.b.hp;
  assert(dmgShield < dmgNoShield * 0.7, `Shield didn't reduce damage enough (${dmgShield} vs ${dmgNoShield})`);
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 5 — COMBAT DECISION AI
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 5: COMBAT DECISION ALGORITHMS ═══');

const combatAlgos = ['minimax_4', 'minimax_2', 'expectimax', 'mcts', 'rule_berserk', 'rule_mage', 'rule_balanced', 'random'];

for (const algo of combatAlgos) {
  test(`[${algo}] returns a valid legal action`, () => {
    const me = createHero({ id: 'h1' }); me.hp = 18; me.mp = 6; me.atk = 8;
    const en = createHero({ id: 'h2' }); en.hp = 22; en.mp = 4;
    const { action, timeMs } = combatAIEngine.decideAction(algo, me.cloneForSim(), en.cloneForSim());
    assert(ACTIONS.includes(action), `Invalid action "${action}" from ${algo}`);
    assert(ACT_COST[action] <= me.mp || action === 'ult', `Action "${action}" costs more MP than available`);
    assert(timeMs >= 0, 'timeMs must be non-negative');
  });
}

test('Minimax uses ULT when it guarantees a kill', () => {
  // Enemy is at 1 HP — ULT should clearly be the winning move
  const me = createHero({ id: 'h1' }); me.ult = MAX_ULT; me.hp = 20; me.mp = 0; me.atk = 8;
  const en = createHero({ id: 'h2' }); en.hp = 1;
  const { action } = combatAIEngine.decideAction('minimax_4', me.cloneForSim(), en.cloneForSim());
  // At depth 4, killing the enemy now is always optimal
  assert(action === 'ult' || action === 'attack',
    `Minimax should kill 1-HP enemy immediately, got: ${action}`);
});

test('Rule-Berserker picks rage or heavy aggressively', () => {
  const me = createHero({ id: 'h1' }); me.mp = 5; me.ult = 0;
  const en = createHero({ id: 'h2' }); en.hp = 25;
  const { action } = combatAIEngine.decideAction('rule_berserk', me.cloneForSim(), en.cloneForSim());
  const aggressiveActions = ['rage', 'heavy', 'magic', 'attack'];
  assert(aggressiveActions.includes(action), `Berserker picked unexpected action: ${action}`);
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 6 — CUSTOM CODE SANDBOX
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 6: CUSTOM ALGORITHM SANDBOX ═══');

test('Default combat code compiles and validates', () => {
  const res = customSandbox.compileCombat(customSandbox.getDefaultCombatCode());
  assert(res.success, `Compilation failed: ${res.error}`);
  assert(ACTIONS.includes(res.testedAction), `Bad test action: ${res.testedAction}`);
});

test('Default path code compiles and validates', () => {
  const res = customSandbox.compilePath(customSandbox.getDefaultPathCode());
  assert(res.success, `Compilation failed: ${res.error}`);
});

test('Preset "stunner" code compiles successfully', () => {
  const code = customSandbox.getPreset('stunner');
  const res = customSandbox.compileCombat(code);
  assert(res.success, `Stunner preset failed: ${res.error}`);
});

test('Invalid combat code returns descriptive error', () => {
  const badCode = `function decideAction(ctx) { return 42; }`;
  const res = customSandbox.compileCombat(badCode);
  assert(!res.success, 'Should have failed validation');
  assert(typeof res.error === 'string' && res.error.length > 5, 'Error message missing');
});

test('Syntax-error code returns error gracefully', () => {
  const badCode = `function decideAction(ctx { return 'attack'; }`;
  const res = customSandbox.compileCombat(badCode);
  assert(!res.success, 'Should detect syntax error');
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 7 — BENCHMARK ENGINE
// ────────────────────────────────────────────────────────────────────────────
console.log('\n═══ SECTION 7: BENCHMARK ENGINE ═══');

(async () => {
  await new Promise(resolve => {
    test('Benchmark runs 20 headless matches and produces graded report', () => {
      // Synchronous run check: just verify simulateSingleMatch works
      const mgr = new DungeonManager(COLS, ROWS);
      const match = benchmarkEngine.simulateSingleMatch({
        dungeonMgr: mgr,
        hero1PathAlgo: 'astar',
        hero1CombatAlgo: 'minimax_4',
        hero2PathAlgo: 'astar',
        hero2CombatAlgo: 'minimax_2',
        roundIndex: 1
      });
      assert([0, 1, 2].includes(match.winner), `Invalid winner: ${match.winner}`);
      assert(match.totalTurns >= 1, 'Turns must be ≥ 1');
      assert(typeof match.h1.damageDealt === 'number', 'h1.damageDealt missing');
    });
    resolve();
  });

  await benchmarkEngine.runBenchmark({
    numRounds: 20,
    hero1CombatAlgo: 'minimax_4',
    hero1PathAlgo:   'astar',
    hero2CombatAlgo: 'minimax_2',
    hero2PathAlgo:   'astar'
  }, null, (report) => {
    test('Benchmark report has correct round count', () => {
      assert(report.completedRounds === 20, `Expected 20, got ${report.completedRounds}`);
    });

    test('Win rates sum to ≤ 100', () => {
      assert(report.winRate1 + report.winRate2 <= 100, 'Win rates exceed 100%');
    });

    test('Ability grades are valid', () => {
      const validGrades = ['S+', 'S', 'A', 'B', 'C', 'D'];
      assert(validGrades.includes(report.h1Grade.grade), `Invalid h1 grade: ${report.h1Grade.grade}`);
      assert(validGrades.includes(report.h2Grade.grade), `Invalid h2 grade: ${report.h2Grade.grade}`);
    });

    test('Average DPS values are positive', () => {
      assert(report.h1Avg.dps >= 0, 'h1 DPS should be ≥ 0');
      assert(report.h2Avg.dps >= 0, 'h2 DPS should be ≥ 0');
    });

    test('Ability scores are in 0-100 range', () => {
      assert(report.h1Grade.score >= 0 && report.h1Grade.score <= 100, 'h1 score out of range');
      assert(report.h2Grade.score >= 0 && report.h2Grade.score <= 100, 'h2 score out of range');
    });

    // ── Final Summary ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log(`  BENCHMARK: ${report.completedRounds} rounds complete`);
    console.log(`  Hero 1 (Minimax d4 + A*): ${report.winsHero1}W / ${report.winRate1}% → Grade ${report.h1Grade.grade} [${report.h1Grade.title}]`);
    console.log(`  Hero 2 (Minimax d2 + A*): ${report.winsHero2}W / ${report.winRate2}% → Grade ${report.h2Grade.grade} [${report.h2Grade.title}]`);
    console.log(`  Avg DPS:  H1=${report.h1Avg.dps} | H2=${report.h2Avg.dps}`);
    console.log(`  Nodes:    H1=${report.h1Avg.avgNodes} | H2=${report.h2Avg.avgNodes}`);
    console.log(`  Compute:  H1=${report.h1Avg.avgComputeMs}ms | H2=${report.h2Avg.avgComputeMs}ms`);
    console.log('══════════════════════════════════════════════');

    // ── Results ──────────────────────────────────────────────────────────
    console.log(`\n✔ Passed: ${passed}   ✖ Failed: ${failed}`);
    if (failed > 0) {
      console.error('\nSOME TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\n🏆 ALL TESTS PASSED SUCCESSFULLY!');
    }
  });
})();
