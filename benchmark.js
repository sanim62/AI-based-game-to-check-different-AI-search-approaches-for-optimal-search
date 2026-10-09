/**
 * AI Dungeon Duel — Ascension Edition
 * Automated Algorithm Testing & Ability Benchmark Engine
 * Evaluates win rates, compute efficiency, tactical prowess, search overhead, and calculates Ability Grades.
 */

class BenchmarkEngine {
  constructor() {
    this.isRunning = false;
    this.shouldCancel = false;
  }

  cancel() {
    this.shouldCancel = true;
  }

  async runBenchmark(config, onProgress, onComplete) {
    this.isRunning = true;
    this.shouldCancel = false;

    const {
      numRounds = 50,
      hero1PathAlgo = 'astar',
      hero1CombatAlgo = 'minimax_4',
      hero2PathAlgo = 'astar',
      hero2CombatAlgo = 'minimax_2',
      hero1Name = 'Algorithm 1',
      hero2Name = 'Algorithm 2'
    } = config;

    const results = {
      hero1Name,
      hero2Name,
      hero1PathAlgo,
      hero1CombatAlgo,
      hero2PathAlgo,
      hero2CombatAlgo,
      totalRounds: numRounds,
      completedRounds: 0,
      winsHero1: 0,
      winsHero2: 0,
      draws: 0,
      winsByTreasureH1: 0,
      winsByTreasureH2: 0,
      winsByCombatH1: 0,
      winsByCombatH2: 0,
      h1Stats: {
        totalDamageDealt: 0, totalDamageTaken: 0, totalHealing: 0,
        trapsHit: 0, itemsGathered: 0, treasuresClaimed: 0,
        nodesExplored: 0, pathSteps: 0, turnsInCombat: 0,
        ultimatesFired: 0, computeTimeCombatMs: 0, computeTimePathMs: 0,
        combatDecisions: 0
      },
      h2Stats: {
        totalDamageDealt: 0, totalDamageTaken: 0, totalHealing: 0,
        trapsHit: 0, itemsGathered: 0, treasuresClaimed: 0,
        nodesExplored: 0, pathSteps: 0, turnsInCombat: 0,
        ultimatesFired: 0, computeTimeCombatMs: 0, computeTimePathMs: 0,
        combatDecisions: 0
      },
      roundLogs: []
    };

    const dungeonMgr = new DungeonManager(COLS, ROWS);

    // Run rounds in async batches to keep UI responsive
    for (let r = 0; r < numRounds; r++) {
      if (this.shouldCancel) break;

      const singleMatch = this.simulateSingleMatch({
        dungeonMgr,
        hero1PathAlgo,
        hero1CombatAlgo,
        hero2PathAlgo,
        hero2CombatAlgo,
        roundIndex: r + 1,
        hero1Name,
        hero2Name
      });

      // Aggregate data
      results.completedRounds++;
      if (singleMatch.winner === 1) {
        results.winsHero1++;
        if (singleMatch.winBy === WIN_BY_TREASURE) results.winsByTreasureH1++;
        else results.winsByCombatH1++;
      } else if (singleMatch.winner === 2) {
        results.winsHero2++;
        if (singleMatch.winBy === WIN_BY_TREASURE) results.winsByTreasureH2++;
        else results.winsByCombatH2++;
      } else {
        results.draws++;
      }

      this.aggregateHeroStats(results.h1Stats, singleMatch.h1);
      this.aggregateHeroStats(results.h2Stats, singleMatch.h2);

      results.roundLogs.push({
        round: r + 1,
        winner: singleMatch.winner,
        winBy: singleMatch.winBy,
        turns: singleMatch.totalTurns,
        h1Hp: singleMatch.h1EndHp,
        h2Hp: singleMatch.h2EndHp
      });

      if (onProgress) {
        onProgress(r + 1, numRounds, {
          h1Wins: results.winsHero1,
          h2Wins: results.winsHero2,
          draws: results.draws,
          pct: Math.round(((r + 1) / numRounds) * 100)
        });
      }

      // Yield event loop every 4 matches
      if (r % 4 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.isRunning = false;

    // Calculate final metrics and ability scorecards
    const finalReport = this.compileFinalReport(results);
    if (onComplete) onComplete(finalReport);
    return finalReport;
  }

  aggregateHeroStats(target, matchHero) {
    target.totalDamageDealt    += matchHero.damageDealt;
    target.totalDamageTaken    += matchHero.damageTaken;
    target.totalHealing        += matchHero.healingDone;
    target.trapsHit            += matchHero.trapsHit;
    target.itemsGathered       += matchHero.itemsGathered;
    target.treasuresClaimed    += matchHero.treasuresClaimed || 0;
    target.nodesExplored       += matchHero.nodesExplored;
    target.pathSteps           += matchHero.pathSteps;
    target.turnsInCombat       += matchHero.turnsInCombat;
    target.ultimatesFired      += matchHero.ultimatesFired;
    target.computeTimeCombatMs += matchHero.computeCombatMs;
    target.computeTimePathMs   += matchHero.computePathMs;
    target.combatDecisions     += matchHero.combatDecisions;
  }

  simulateSingleMatch({ dungeonMgr, hero1PathAlgo, hero1CombatAlgo, hero2PathAlgo, hero2CombatAlgo, roundIndex, hero1Name = 'Warrior', hero2Name = 'Mage' }) {
    const dungeon = dungeonMgr.generate();
    const rooms   = dungeon.rooms;
    const p1 = rooms[0];
    const p2 = rooms[rooms.length - 1];

    const h1 = createHero({ id: 'h1', role: 'warrior', name: hero1Name || 'Warrior', x: p1.cx, y: p1.cy, maxHp: 100, hp: 100, atk: 20, pathAlgoId: hero1PathAlgo, combatAlgoId: hero1CombatAlgo });
    const h2 = createHero({ id: 'h2', role: 'mage', name: hero2Name || 'Mage', x: p2.cx, y: p2.cy, maxHp: 70, hp: 70, atk: 10, pathAlgoId: hero2PathAlgo, combatAlgoId: hero2CombatAlgo });

    const items = dungeon.items.map(it => ({ ...it }));
    const mkStats = () => ({
      damageDealt: 0, damageTaken: 0, healingDone: 0,
      trapsHit: 0, itemsGathered: 0, treasuresClaimed: 0,
      nodesExplored: 0, pathSteps: 0, turnsInCombat: 0,
      ultimatesFired: 0, computeCombatMs: 0, computePathMs: 0, combatDecisions: 0
    });
    const matchH1 = mkStats();
    const matchH2 = mkStats();

    let phase     = 'explore';
    let totalTurns = 0;
    let combatRounds = 0;
    let winner    = 0;  // 0=draw, 1=h1, 2=h2
    let winBy     = WIN_BY_COMBAT;
    const maxTurns = 350;

    const customCombatFn = customSandbox.compiledCombatFn;
    const customPathFn   = customSandbox.compiledPathFn;

    // Helper: run one hero's pathfinding step toward goal
    const stepHero = (hero, other, stats, pathAlgo) => {
      const grandTreasure = items.find(it => it.isMainTreasure && !it.collected);
      let goal = grandTreasure
        ? { x: grandTreasure.x, y: grandTreasure.y }
        : { x: other.x, y: other.y };

      // Small detour for valuable nearby items
      if (grandTreasure) {
        const distTT = manhattanDist(hero, grandTreasure);
        for (const it of items) {
          if (it.collected || it.isMainTreasure) continue;
          const d = manhattanDist(hero, it);
          if (d <= 3 && d < distTT - 2 &&
            ((it.type === 'potion' && hero.hp < (hero.maxHp || MAX_HP) * 0.5) ||
             (it.type === 'mpot'   && hero.mp < 3) ||
              it.type === 'power')) {
            goal = { x: it.x, y: it.y };
            break;
          }
        }
      }

      const pathRes = pathfindingEngine.findPath(
        pathAlgo, hero.x, hero.y, goal.x, goal.y,
        dungeon.grid, dungeon.trapCosts,
        other.alive !== false ? other : null, customPathFn
      );
      stats.nodesExplored += pathRes.nodesVisited || 0;
      stats.computePathMs += pathRes.timeTakenMs  || 0;

      if (pathRes.path && pathRes.path.length > 0) {
        const [dx, dy] = pathRes.path[0];
        hero.x += dx;
        hero.y += dy;
        stats.pathSteps++;
      }

      // Traps
      const tk = `${hero.x},${hero.y}`;
      if (dungeon.traps.has(tk) && !dungeon.trapCosts[tk]) {
        hero.hp = Math.max(0, hero.hp - TRAP_DAMAGE);
        dungeon.trapCosts[tk] = 8;
        stats.trapsHit++;
        stats.damageTaken += TRAP_DAMAGE;
      }

      // Items
      for (const it of items) {
        if (!it.collected && it.x === hero.x && it.y === hero.y) {
          it.collected = true;
          stats.itemsGathered++;
          if (it.isMainTreasure) {
            stats.treasuresClaimed++;
            return 'treasure'; // signal immediate round end
          }
          if (it.type === 'potion')  { hero.hp = Math.min(hero.maxHp || MAX_HP, hero.hp + POTION_HEAL); stats.healingDone += POTION_HEAL; }
          else if (it.type === 'mpot')  { hero.mp = Math.min(MAX_MP, hero.mp + 5); }
          else if (it.type === 'power') { hero.atk += 2; }
          else if (it.type === 'shrine'){ hero.ult = Math.min(MAX_ULT, hero.ult + 40); }
        }
      }
      return null;
    };

    // ── MAIN SIMULATION LOOP ─────────────────────────────────────────────
    while (totalTurns < maxTurns) {
      totalTurns++;

      if (phase === 'explore') {
        const aliveHeroes = [h1, h2].filter(h => h.alive !== false);

        // Collision check → switch to combat
        if (aliveHeroes.length === 2 && manhattanDist(h1, h2) <= 1) {
          phase = 'combat';
          continue;
        }

        // Step each alive hero
        let roundOver = false;
        const pairs = [
          { hero: h1, other: h2, stats: matchH1, algo: hero1PathAlgo, key: 1 },
          { hero: h2, other: h1, stats: matchH2, algo: hero2PathAlgo, key: 2 }
        ];
        for (const { hero, other, stats, algo, key } of pairs) {
          if (hero.alive === false) continue;
          const signal = stepHero(hero, other, stats, algo);
          if (signal === 'treasure') {
            winner = key;
            winBy  = WIN_BY_TREASURE;
            roundOver = true;
            break;
          }
        }
        if (roundOver) break;

      } else if (phase === 'combat') {
        // One-at-a-time combat turns
        const combatOrder = [
          { hero: h1, target: h2, stats: matchH1, tStats: matchH2, algoId: hero1CombatAlgo, key: 1 },
          { hero: h2, target: h1, stats: matchH2, tStats: matchH1, algoId: hero2CombatAlgo, key: 2 }
        ];

        let combatDone = false;
        combatRounds++;
        for (const { hero, target, stats, tStats, algoId, key } of combatOrder) {
          stats.turnsInCombat++;

          // Reset block at start of turn, decrement fireball cooldown
          hero.blocked = false;
          if (hero.fireballCooldown > 0) hero.fireballCooldown--;

          if (hero.stunned) {
            hero.statusTurns.stun--;
            if (hero.statusTurns.stun <= 0) hero.stunned = false;
            continue;
          }

          const decision = combatAIEngine.decideAction(algoId, hero, target, customCombatFn);
          stats.combatDecisions++;
          stats.computeCombatMs += decision.timeMs;
          if (decision.action === 'ult') stats.ultimatesFired++;

          const outcome = combatAIEngine.simAct(hero, target, decision.action, false);
          const dmg    = Math.max(0, target.hp - outcome.b.hp);
          const healed = Math.max(0, outcome.a.hp  - hero.hp);

          stats.damageDealt  += dmg;
          tStats.damageTaken += dmg;
          stats.healingDone  += healed;

          hero.hp = outcome.a.hp; hero.mp = outcome.a.mp; hero.ult = outcome.a.ult;
          hero.shield = outcome.a.shield; hero.raging = outcome.a.raging;
          hero.blocked = outcome.a.blocked;
          hero.fireballCooldown = outcome.a.fireballCooldown;
          hero.statusTurns = outcome.a.statusTurns;

          target.hp = outcome.b.hp; target.poisoned = outcome.b.poisoned;
          target.burned = outcome.b.burned; target.stunned = outcome.b.stunned;
          target.statusTurns = outcome.b.statusTurns;

          // Death check
          if (target.hp <= 0) {
            target.alive = false;
            target.hp = 0;
            const treasureLeft = items.find(it => it.isMainTreasure && !it.collected);
            if (treasureLeft) {
              // Survivor keeps exploring
              phase = 'explore';
            } else {
              winner = key;
              winBy  = WIN_BY_COMBAT;
              combatDone = true;
            }
            break;
          }
        }
        if (combatDone || winner !== 0) break;

        // 40 combat rounds limit: hero with more HP wins
        if (combatRounds >= 40) {
          if (h1.hp > h2.hp)      { winner = 1; winBy = WIN_BY_COMBAT; }
          else if (h2.hp > h1.hp) { winner = 2; winBy = WIN_BY_COMBAT; }
          else                    { winner = 0; winBy = WIN_BY_COMBAT; }
          break;
        }
      }
    }

    // Determine winner from HP if loop timed out
    if (winner === 0) {
      if (h1.hp > h2.hp)      { winner = 1; winBy = WIN_BY_COMBAT; }
      else if (h2.hp > h1.hp) { winner = 2; winBy = WIN_BY_COMBAT; }
    }

    return { winner, winBy, totalTurns, h1: matchH1, h2: matchH2, h1EndHp: Math.max(0, h1.hp), h2EndHp: Math.max(0, h2.hp) };
  }

  compileFinalReport(res) {
    const n = Math.max(1, res.completedRounds);
    const winRate1 = Math.round((res.winsHero1 / n) * 100);
    const winRate2 = Math.round((res.winsHero2 / n) * 100);

    const h1Avg = {
      dps: Math.round((res.h1Stats.totalDamageDealt / Math.max(1, res.h1Stats.turnsInCombat)) * 10) / 10,
      damageTakenPerRound: Math.round(res.h1Stats.totalDamageTaken / n),
      avgNodes: Math.round(res.h1Stats.nodesExplored / n),
      avgTrapsHit: Math.round((res.h1Stats.trapsHit / n) * 10) / 10,
      avgItems: Math.round((res.h1Stats.itemsGathered / n) * 10) / 10,
      treasureRate: Math.round((res.h1Stats.treasuresClaimed / n) * 100),
      avgComputeMs: Math.round((res.h1Stats.computeTimeCombatMs / Math.max(1, res.h1Stats.combatDecisions)) * 100) / 100,
      avgUlts: Math.round((res.h1Stats.ultimatesFired / n) * 10) / 10
    };

    const h2Avg = {
      dps: Math.round((res.h2Stats.totalDamageDealt / Math.max(1, res.h2Stats.turnsInCombat)) * 10) / 10,
      damageTakenPerRound: Math.round(res.h2Stats.totalDamageTaken / n),
      avgNodes: Math.round(res.h2Stats.nodesExplored / n),
      avgTrapsHit: Math.round((res.h2Stats.trapsHit / n) * 10) / 10,
      avgItems: Math.round((res.h2Stats.itemsGathered / n) * 10) / 10,
      treasureRate: Math.round((res.h2Stats.treasuresClaimed / n) * 100),
      avgComputeMs: Math.round((res.h2Stats.computeTimeCombatMs / Math.max(1, res.h2Stats.combatDecisions)) * 100) / 100,
      avgUlts: Math.round((res.h2Stats.ultimatesFired / n) * 10) / 10
    };

    // Ability Score: win-rate + DPS + trap safety + speed + treasure claim rate
    const calcAbilityScore = (winRate, dps, traps, avgCompute, treasureRate) => {
      let score = winRate * 0.45;             // up to 45 pts from win rate
      score += Math.min(20, dps * 3);         // up to 20 pts from DPS
      score += Math.max(0, 10 - traps * 5);  // up to 10 pts from trap avoidance
      score += Math.max(0, 10 - avgCompute * 2); // up to 10 pts from speed
      score += Math.min(15, treasureRate * 0.15); // up to 15 pts for finding treasure
      return Math.round(Math.min(100, Math.max(5, score)));
    };

    const h1Score = calcAbilityScore(winRate1, h1Avg.dps, h1Avg.avgTrapsHit, h1Avg.avgComputeMs, h1Avg.treasureRate);
    const h2Score = calcAbilityScore(winRate2, h2Avg.dps, h2Avg.avgTrapsHit, h2Avg.avgComputeMs, h2Avg.treasureRate);

    const getGrade = score => {
      if (score >= 90) return { grade: 'S+', title: 'Grandmaster Apex AI', color: '#f59e0b' };
      if (score >= 80) return { grade: 'S', title: 'Master Strategist', color: '#10b981' };
      if (score >= 70) return { grade: 'A', title: 'Expert Competitor', color: '#3b82f6' };
      if (score >= 55) return { grade: 'B', title: 'Tactical Contender', color: '#8b5cf6' };
      if (score >= 40) return { grade: 'C', title: 'Developing Agent', color: '#ec4899' };
      return { grade: 'D', title: 'Suboptimal Baseline', color: '#ef4444' };
    };

    return {
      ...res,
      winRate1,
      winRate2,
      h1Avg,
      h2Avg,
      h1Grade: { ...getGrade(h1Score), score: h1Score },
      h2Grade: { ...getGrade(h2Score), score: h2Score }
    };
  }
}

// Global benchmark singleton
const benchmarkEngine = new BenchmarkEngine();
