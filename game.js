/**
 * AI Dungeon Duel — Ascension Edition
 * Core Game Controller: State Machine, Round/Series Execution, and Turn Flow
 */

class GameEngine {
  constructor() {
    this.dungeonMgr = new DungeonManager(COLS, ROWS);
    this.renderer = null;

    // Game Config & State
    this.mode = 'ai'; // 'ai' or 'human'
    this.phase = 'explore'; // 'explore', 'combat', 'ended'
    this.round = 1;
    this.seriesBo = 3;
    this.wins = { h1: 0, h2: 0 };
    this.speedMs = SPEED_MAP[3];

    this.running = false;
    this.paused = false;
    this.stepTimer = null;
    this.combatTurn = 0;

    // Heroes & Dungeon
    this.dungeon = null;
    this.heroes = [];
    this.items = [];

    // Human Interaction
    this.humanWaiting = false;
    this.humanChoice = null;

    // Algorithm Assignments for Hero 1 and Hero 2
    this.h1PathAlgo = 'astar';
    this.h1CombatAlgo = 'minimax_4';
    this.h2PathAlgo = 'astar';
    this.h2CombatAlgo = 'minimax_2';

    // Logging & Observers
    this.onStateChange = null;
    this.onLogMessage = null;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  log(msg, type = 'combat') {
    if (this.onLogMessage) {
      this.onLogMessage(msg, type);
    }
  }

  initMatch() {
    this.dungeon = this.dungeonMgr.generate();
    const rooms = this.dungeon.rooms;
    const p1 = rooms[0];
    const p2 = rooms[rooms.length - 1];

    this.heroes = [
      createHero({
        id: 'h1',
        role: 'warrior',
        name: this.mode === 'human' ? '⚔ You (Warrior)' : '⚔ Warrior (Minimax)',
        x: p1.cx,
        y: p1.cy,
        color: '#a78bfa',
        dark: '#4c1d95',
        symbol: 'W',
        maxHp: 100,
        hp: 100,
        atk: 20,
        isHuman: this.mode === 'human',
        pathAlgoId: this.h1PathAlgo || 'astar',
        combatAlgoId: this.h1CombatAlgo || 'minimax_4'
      }),
      createHero({
        id: 'h2',
        role: 'mage',
        name: '🔮 Mage (Expectimax)',
        x: p2.cx,
        y: p2.cy,
        color: '#f87171',
        dark: '#7f1d1d',
        symbol: 'M',
        maxHp: 70,
        hp: 70,
        atk: 10,
        isHuman: false,
        pathAlgoId: this.h2PathAlgo || 'astar',
        combatAlgoId: this.h2CombatAlgo || 'expectimax'
      })
    ];

    this.items = this.dungeon.items.map(it => ({ ...it }));
    this.goblins = this.dungeon.goblins
      ? this.dungeon.goblins.map(g => ({ ...g, patrolPoints: g.patrolPoints.map(p => ({ ...p })) }))
      : [];
    this.phase = 'explore';
    this.combatTurn = 0;
    this.combatRound = 1;
    this.humanWaiting = false;
    this.humanChoice = null;

    this.updateVisibility();
    if (this.onStateChange) this.onStateChange();
  }

  updateVisibility() {
    if (!this.dungeon || !this.heroes.length) return;
    this.heroes.forEach(h => {
      h.vis = this.dungeonMgr.getVisibleTiles(h.x, h.y, this.dungeon.grid, 5);
      h.vis.forEach(k => h.explored.add(k));
    });
    if (this.renderer) {
      this.renderer.updateFog(this.heroes);
    }
  }

  start() {
    clearTimeout(this.stepTimer);
    if (!this.dungeon) this.initMatch();
    this.paused = false;
    this.running = true;
    this.humanWaiting = false;
    this.humanChoice = null;
    this.scheduleStep();
    if (this.onStateChange) this.onStateChange();
  }

  pause() {
    this.paused = !this.paused;
    if (!this.paused && this.running && !this.humanWaiting) {
      this.scheduleStep();
    } else {
      clearTimeout(this.stepTimer);
    }
    if (this.onStateChange) this.onStateChange();
  }

  stepOnce() {
    if (this.phase === 'ended') return;
    this.paused = true;
    clearTimeout(this.stepTimer);

    if (this.phase === 'explore') {
      this.exploreStep();
    } else if (this.phase === 'combat') {
      this.combatStep();
    }
    if (this.onStateChange) this.onStateChange();
  }

  reset() {
    clearTimeout(this.stepTimer);
    this.running = false;
    this.paused = false;
    this.round = 1;
    this.wins = { h1: 0, h2: 0 };
    this.humanWaiting = false;
    this.humanChoice = null;
    this.initMatch();
    if (this.onStateChange) this.onStateChange();
  }

  scheduleStep() {
    if (!this.running || this.paused) return;
    this.stepTimer = setTimeout(() => {
      if (this.phase === 'explore') {
        this.exploreStep();
      } else if (this.phase === 'combat') {
        if (this.mode === 'human' && this.combatTurn === 0 && !this.humanChoice) {
          this.humanWaiting = true;
          if (this.onStateChange) this.onStateChange();
          return;
        }
        this.combatStep();
      }

      if (this.running && !this.paused && !(this.mode === 'human' && this.humanWaiting)) {
        this.scheduleStep();
      }
    }, this.speedMs);
  }

  exploreStep() {
    const [h1, h2] = this.heroes;
    const alive = this.heroes.filter(h => h.alive !== false);

    // Only check collision between alive heroes
    if (alive.length === 2 && manhattanDist(h1, h2) <= 1) {
      this.phase = 'combat';
      this.combatTurn = 0;
      this.log('══ PATHS CROSS — HEROES CLASH! Combat begins! ══', 'system');
      soundSystem.playTone(350, 'sawtooth', 0.25, 0.2);
      if (typeof window !== 'undefined' && window.uiController && window.uiController.showDeclaration) {
        window.uiController.showDeclaration('⚔', 'COMBAT ENGAGED!', `${h1.name} clashes with ${h2.name}!`, 'combat', 2000);
      }
      this.updateVisibility();
      if (this.onStateChange) this.onStateChange();
      return;
    }

    const customPathFn = customSandbox.compiledPathFn;

    // Find the Grand Treasure item
    const grandTreasure = this.items.find(it => it.isMainTreasure && !it.collected);

    // Both heroes navigate the dungeon
    this.heroes.forEach((hero, idx) => {
      if (hero.alive === false) return; // skip dead heroes
      const other = this.heroes[1 - idx];

      // Update spatial memory of enemy position if in sight
      if (other.alive !== false && hero.vis.has(`${other.x},${other.y}`)) {
        hero.knownEnemy = { x: other.x, y: other.y };
      }

      // ── Strategic Goal Determination ─────────────────────────────────────
      // Hero (Warrior): Primary quest is to reach and claim the Grand Treasure.
      // Mage (Guardian): Primary quest is to intercept and stop the Hero before he claims it!
      let goal;
      const isMage = hero.role === 'mage' || idx === 1;

      if (!isMage) {
        // Hero (Warrior) targets the Grand Treasure
        goal = grandTreasure
          ? { x: grandTreasure.x, y: grandTreasure.y }
          : (hero.knownEnemy || { x: other.x, y: other.y });

        // Secondary: Detour for nearby support items if worth it
        if (grandTreasure) {
          const distToTreasure = manhattanDist(hero, grandTreasure);
          for (const it of this.items) {
            if (it.collected || it.isMainTreasure) continue;
            const d = manhattanDist(hero, it);
            const worthDetour =
              d <= 3 && d < distToTreasure - 2 && (
                (it.type === 'potion' && hero.hp < (hero.maxHp || MAX_HP) * 0.5) ||
                (it.type === 'mpot'   && hero.mp < 3) ||
                it.type === 'power'
              );
            if (worthDetour) {
              goal = { x: it.x, y: it.y };
              break;
            }
          }
        }
      } else {
        // Mage targets the Hero to intercept and stop him!
        // If the other hero is known or visible, intercept them; otherwise guard the treasure choke point
        if (other.alive !== false) {
          if (hero.knownEnemy) {
            goal = { x: hero.knownEnemy.x, y: hero.knownEnemy.y };
          } else if (grandTreasure) {
            // Guard the Grand Treasure until the hero is located
            goal = { x: grandTreasure.x, y: grandTreasure.y };
          } else {
            goal = { x: other.x, y: other.y };
          }
        } else {
          // If Hero is already defeated, Mage claims the treasure
          goal = grandTreasure ? { x: grandTreasure.x, y: grandTreasure.y } : { x: hero.x, y: hero.y };
        }
      }

      // Execute selected pathfinding algorithm
      let pathResult = pathfindingEngine.findPath(
        hero.pathAlgoId,
        hero.x, hero.y,
        goal.x, goal.y,
        this.dungeon.grid,
        this.dungeon.trapCosts,
        other.alive !== false ? other : null,
        customPathFn
      );

      // ── Fallback 1: if path is null (blocked by other hero or disconnected),
      //    retry A* ignoring the other hero entirely
      if (!pathResult.path) {
        pathResult = pathfindingEngine.runAStar(
          hero.x, hero.y, goal.x, goal.y,
          this.dungeon.grid, this.dungeon.trapCosts, null
        );
      }

      hero.path = pathResult.path || [];
      hero.lastExploredNodesCount = pathResult.nodesVisited || 0;
      hero.lastSearchTree = pathResult.searchTree || [];
      hero.stats.nodesExploredTotal += hero.lastExploredNodesCount;
      hero.stats.totalComputeTimeMs += pathResult.timeTakenMs || 0;

      // Advance one step along planned path
      if (hero.path && hero.path.length > 0) {
        const [dx, dy] = hero.path[0];
        const nx = hero.x + dx;
        const ny = hero.y + dy;
        // Validate the step stays on a floor tile (never walk into a wall)
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.dungeon.grid[ny][nx] === 0) {
          hero.x = nx;
          hero.y = ny;
          hero.stats.stepsTaken++;
        }
      } else {
        // ── Fallback 2: pick any free adjacent tile to avoid being truly stuck
        const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
        for (const [dx, dy] of dirs) {
          const nx = hero.x + dx;
          const ny = hero.y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.dungeon.grid[ny][nx] === 0) {
            hero.x = nx;
            hero.y = ny;
            hero.stats.stepsTaken++;
            break;
          }
        }
      }

      // Check for Traps
      const tk = `${hero.x},${hero.y}`;
      if (this.dungeon.traps.has(tk) && !this.dungeon.trapCosts[tk]) {
        hero.hp = Math.max(0, hero.hp - TRAP_DAMAGE);
        this.dungeon.trapCosts[tk] = 8;
        hero.stats.trapsTriggered++;
        hero.stats.damageTaken += TRAP_DAMAGE;
        this.log(`⚠ ${hero.name} steps on a TRAP! -${TRAP_DAMAGE} HP`, idx === 0 ? 'hero1' : 'hero2');
        soundSystem.sfxTrap();
        if (this.renderer) {
          this.renderer.spawnParticles(hero.x, hero.y, '#ef4444', 12);
          this.renderer.spawnFloatingText(hero.x, hero.y, `-${TRAP_DAMAGE} HP`, '#ef4444');
          this.renderer.shake(3);
        }
      }

      // Check for Items
      for (const it of this.items) {
        if (!it.collected && it.x === hero.x && it.y === hero.y) {
          it.collected = true;
          hero.stats.itemsCollected++;
          let msg = '';

          // ── GRAND TREASURE: round won immediately! ─────────────────────
          if (it.isMainTreasure) {
            this.log(`🏆 ${hero.name} CLAIMS THE GRAND TREASURE! ══ ROUND OVER! ══`, 'system');
            soundSystem.sfxVictory();
            if (this.renderer) {
              this.renderer.spawnParticles(hero.x, hero.y, '#fde68a', 36);
              this.renderer.spawnParticles(hero.x, hero.y, '#f59e0b', 24);
              this.renderer.spawnFloatingText(hero.x, hero.y, '★ TREASURE!', '#fde68a');
              this.renderer.shake(6);
            }
            hero.stats.treasuresClaimed = (hero.stats.treasuresClaimed || 0) + 1;
            this.endRound(idx === 0 ? 'h1' : 'h2', WIN_BY_TREASURE);
            return; // stop processing further items
          }

          // ── Support items ──────────────────────────────────────────────
          if (it.type === 'potion') {
            hero.hp = Math.min(hero.maxHp || MAX_HP, hero.hp + POTION_HEAL);
            hero.stats.healingDone += POTION_HEAL;
            msg = `${hero.name} drank Health Potion (+${POTION_HEAL} HP)`;
            soundSystem.sfxItem('potion');
          } else if (it.type === 'mpot') {
            hero.mp = Math.min(MAX_MP, hero.mp + 5);
            msg = `${hero.name} drank Mana Potion (+5 MP)`;
            soundSystem.sfxItem('mpot');
          } else if (it.type === 'power') {
            hero.atk += 2;
            msg = `${hero.name} claimed Power Gem (+2 ATK)`;
            soundSystem.sfxItem('power');
          } else if (it.type === 'chest') {
            const roll = Math.random();
            if (roll < 0.4) {
              hero.hp = Math.min(MAX_HP, hero.hp + 6);
              msg = `${hero.name} unlocked Chest: +6 HP!`;
            } else if (roll < 0.7) {
              hero.mp = Math.min(MAX_MP, hero.mp + 4);
              msg = `${hero.name} unlocked Chest: +4 MP!`;
            } else {
              hero.atk += 1;
              msg = `${hero.name} unlocked Chest: +1 ATK!`;
            }
            soundSystem.sfxItem('chest');
          } else if (it.type === 'shrine') {
            hero.ult = Math.min(MAX_ULT, hero.ult + 40);
            msg = `${hero.name} attuned at Mystic Shrine (+40 ULT charge)`;
            soundSystem.sfxItem('shrine');
          }

          this.log(`✦ ${msg}`, idx === 0 ? 'hero1' : 'hero2');
          if (this.renderer) {
            this.renderer.spawnParticles(hero.x, hero.y, idx === 0 ? '#a78bfa' : '#f87171', 14);
            this.renderer.spawnFloatingText(hero.x, hero.y, '✦', '#fde68a');
          }
        }
      }
    });

    // Goblins take their exploration/patrol turn
    this.executeGoblinsTurn();

    this.updateVisibility();
    if (this.onStateChange) this.onStateChange();
  }

  combatStep() {
    const activeHero = this.heroes[this.combatTurn];
    const targetHero = this.heroes[1 - this.combatTurn];
    const heroTag = this.combatTurn === 0 ? 'hero1' : 'hero2';

    // Handle Stun
    if (activeHero.stunned) {
      this.log(`${activeHero.name} is STUNNED — skips turn!`, heroTag);
      activeHero.statusTurns.stun--;
      if (activeHero.statusTurns.stun <= 0) activeHero.stunned = false;
      this.combatTurn = 1 - this.combatTurn;
      if (this.onStateChange) this.onStateChange();
      return;
    }

    // Human Turn Gate
    if (this.mode === 'human' && this.combatTurn === 0 && !this.humanChoice) {
      this.humanWaiting = true;
      if (this.onStateChange) this.onStateChange();
      return;
    }

    this.humanWaiting = false;

    // Start-of-turn reset for acting hero
    activeHero.blocked = false;
    if (activeHero.fireballCooldown > 0) {
      activeHero.fireballCooldown--;
    }

    let action = 'attack';
    let decisionTimeMs = 0;

    if (this.mode === 'human' && this.combatTurn === 0) {
      action = this.humanChoice || 'attack';
      this.humanChoice = null;
    } else {
      const customCombatFn = customSandbox.compiledCombatFn;
      const decision = combatAIEngine.decideAction(
        activeHero.combatAlgoId,
        activeHero,
        targetHero,
        customCombatFn
      );
      action = decision.action;
      decisionTimeMs = decision.timeMs;
    }

    activeHero.recordDecision(action, decisionTimeMs);
    this.applyCombatAction(activeHero, targetHero, action, heroTag);

    // ── Check Death ─────────────────────────────────────────────────────
    if (activeHero.hp <= 0 || targetHero.hp <= 0) {
      const defeatedHero   = activeHero.hp <= 0 ? activeHero : targetHero;
      const survivingHero  = activeHero.hp <= 0 ? targetHero : activeHero;
      const survivorKey    = this.heroes.indexOf(survivingHero) === 0 ? 'h1' : 'h2';

      defeatedHero.alive = false;
      defeatedHero.hp    = 0;

      // Grand Treasure still on map? Surviving hero continues exploring
      const treasureLeft = this.items.find(it => it.isMainTreasure && !it.collected);
      if (treasureLeft) {
        this.log(
          `⚔ ${defeatedHero.name} is DEFEATED in combat! ` +
          `${survivingHero.name} continues toward the treasure!`,
          'system'
        );
        soundSystem.playTone(200, 'sawtooth', 0.3, 0.4);
        if (this.renderer) {
          this.renderer.spawnParticles(defeatedHero.x, defeatedHero.y, '#ef4444', 20);
          this.renderer.spawnFloatingText(defeatedHero.x, defeatedHero.y, '💀', '#ef4444');
        }
        this.phase = 'explore';
        this.updateVisibility();
        if (this.onStateChange) this.onStateChange();
        return;
      }

      // Treasure already gone — winner of combat wins the round
      this.endRound(survivorKey, WIN_BY_COMBAT);
      return;
    }

    // Turn cycle: Hero 1 → Hero 2 → Goblins → next round
    if (this.combatTurn === 1) {
      this.combatTurn = 0;
      this.executeGoblinsTurn();
      this.combatRound++;
      this.log(`══ Round ${this.combatRound} / ${MAX_COMBAT_ROUNDS} ══`, 'system');

      // Spec win condition: 40 round timeout → hero with more HP wins
      if (this.combatRound > MAX_COMBAT_ROUNDS) {
        const [h1, h2] = this.heroes;
        this.log(`⏱ 40 ROUND LIMIT REACHED! Winner decided by remaining HP (${h1.name}: ${h1.hp} HP vs ${h2.name}: ${h2.hp} HP)`, 'system');
        if (h1.hp > h2.hp) {
          this.endRound('h1', WIN_BY_COMBAT);
        } else if (h2.hp > h1.hp) {
          this.endRound('h2', WIN_BY_COMBAT);
        } else {
          this.endRound(null, WIN_BY_COMBAT);
        }
        return;
      }
    } else {
      this.combatTurn = 1;
    }

    if (this.onStateChange) this.onStateChange();
  }

  executeGoblinsTurn() {
    if (!this.goblins || !this.goblins.length) return;
    const [h1, h2] = this.heroes;
    const aliveHeroes = this.heroes.filter(h => h.alive);
    if (!aliveHeroes.length) return;

    this.goblins.forEach(gob => {
      if (!gob.alive) return;

      // Find closest alive hero
      const d1 = h1.alive ? manhattanDist(gob, h1) : Infinity;
      const d2 = h2.alive ? manhattanDist(gob, h2) : Infinity;
      const target = d1 <= d2 ? h1 : h2;
      const dist = Math.min(d1, d2);

      // FSM Evaluation
      if (gob.hp <= GOBLIN_FLEE_HP) {
        // 1. FLEE State: move away from target hero
        gob.state = GOBLIN_STATES.FLEE;
        const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
        let bestTile = null;
        let maxD = dist;
        for (const [dx, dy] of dirs) {
          const nx = gob.x + dx;
          const ny = gob.y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.dungeon.grid[ny][nx] === 0) {
            const nd = manhattanDist({ x: nx, y: ny }, target);
            if (nd > maxD) {
              maxD = nd;
              bestTile = { x: nx, y: ny };
            }
          }
        }
        if (bestTile) {
          gob.x = bestTile.x;
          gob.y = bestTile.y;
        }
        this.log(`👺 ${gob.name} (HP: ${gob.hp}) flees from ${target.name}! [FSM: Flee]`, 'combat');
      } else if (dist <= 1) {
        // 2. ATTACK State: deal 5 dmg to closest hero
        gob.state = GOBLIN_STATES.ATTACK;
        const blockMod = target.blocked ? 0.5 : 1.0;
        const shieldMod = target.shield ? 0.38 : 1.0;
        const dmg = Math.max(1, Math.round(GOBLIN_ATK * blockMod * shieldMod));
        target.hp = Math.max(0, target.hp - dmg);
        target.stats.damageTaken += dmg;
        soundSystem.sfxHit(false);
        this.log(`👺 ${gob.name} attacks ${target.name} for ${dmg} dmg!${target.blocked ? ' (blocked 50%)' : ''} [FSM: Attack]`, 'combat');
        if (this.renderer) {
          this.renderer.spawnParticles(target.x, target.y, '#ef4444', 8);
          this.renderer.spawnFloatingText(target.x, target.y, `-${dmg}`, '#ef4444');
          this.renderer.shake(2);
        }
      } else if (dist <= GOBLIN_CHASE_RANGE) {
        // 3. CHASE State: move towards target hero
        gob.state = GOBLIN_STATES.CHASE;
        const pathRes = pathfindingEngine.runAStar(gob.x, gob.y, target.x, target.y, this.dungeon.grid, {}, null);
        if (pathRes.path && pathRes.path.length > 0) {
          const [dx, dy] = pathRes.path[0];
          const nx = gob.x + dx;
          const ny = gob.y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.dungeon.grid[ny][nx] === 0) {
            gob.x = nx;
            gob.y = ny;
          }
        }
        this.log(`👺 ${gob.name} chases ${target.name}! [FSM: Chase]`, 'combat');
      } else {
        // 4. PATROL State: step toward patrol waypoint
        gob.state = GOBLIN_STATES.PATROL;
        if (gob.patrolPoints && gob.patrolPoints.length) {
          const wp = gob.patrolPoints[gob.patrolIdx % gob.patrolPoints.length];
          if (gob.x === wp.x && gob.y === wp.y) {
            gob.patrolIdx = (gob.patrolIdx + 1) % gob.patrolPoints.length;
          }
          const nextWp = gob.patrolPoints[gob.patrolIdx % gob.patrolPoints.length];
          const pathRes = pathfindingEngine.runAStar(gob.x, gob.y, nextWp.x, nextWp.y, this.dungeon.grid, {}, null);
          if (pathRes.path && pathRes.path.length > 0) {
            const [dx, dy] = pathRes.path[0];
            const nx = gob.x + dx;
            const ny = gob.y + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.dungeon.grid[ny][nx] === 0) {
              gob.x = nx;
              gob.y = ny;
            }
          }
        }
      }

      // Goblin trap check
      const tk = `${gob.x},${gob.y}`;
      if (this.dungeon.traps.has(tk)) {
        gob.hp = Math.max(0, gob.hp - TRAP_DAMAGE);
        if (gob.hp <= 0) {
          gob.alive = false;
          this.log(`💀 ${gob.name} triggered a trap and died!`, 'combat');
          if (this.renderer) {
            this.renderer.spawnParticles(gob.x, gob.y, '#10b981', 12);
            this.renderer.spawnFloatingText(gob.x, gob.y, '💀', '#ef4444');
          }
        }
      }
    });

    if (h1.hp <= 0 || h2.hp <= 0) {
      if (h1.hp <= 0 && h2.hp > 0) this.endRound('h2', WIN_BY_COMBAT);
      else if (h2.hp <= 0 && h1.hp > 0) this.endRound('h1', WIN_BY_COMBAT);
      else this.endRound(null, WIN_BY_COMBAT);
    }
  }

  applyCombatAction(me, en, act, cls) {
    const shieldMod = en.shield ? 0.38 : 1.0;
    const blockMod = en.blocked ? 0.5 : 1.0;
    const rageMod = me.raging ? 1.35 : 1.0;
    const hasMp = me.mp >= (ACT_COST[act] !== undefined ? ACT_COST[act] : 0);
    const isCrit = Math.random() < 0.12;
    const critMult = isCrit ? 1.6 : 1.0;

    let dmg = 0;
    let msg = '';

    switch (act) {
      case 'slash': {
        const hit = Math.random() < 0.90;
        if (hit) {
          dmg = Math.round(20 * shieldMod * blockMod * rageMod);
          en.hp = Math.max(0, en.hp - dmg);
          me.ult = Math.min(me.maxUlt || MAX_ULT, me.ult + (ACT_ULT.slash || 10));
          soundSystem.sfxHit(false);
          msg = `⚔ ${me.name} uses SLASH → ${dmg} dmg! (90% hit)${en.blocked ? ' (blocked 50%)' : ''}${en.shield ? ' (shielded)' : ''}`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#a78bfa', 14);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}`, '#a78bfa');
            this.renderer.shake(3);
          }
        } else {
          msg = `⚔ ${me.name} swings SLASH but MISSES! (90% hit rate)`;
          soundSystem.playTone(180, 'sine', 0.15, 0.1);
          if (this.renderer) {
            this.renderer.spawnFloatingText(en.x, en.y, 'MISS!', '#9ca3af');
          }
        }
        break;
      }

      case 'block': {
        me.blocked = true;
        me.ult = Math.min(me.maxUlt || MAX_ULT, me.ult + (ACT_ULT.block || 5));
        soundSystem.sfxShield();
        msg = `🛡 ${me.name} assumes a defensive BLOCK! (Takes 50% less damage until next turn)`;
        if (this.renderer) {
          this.renderer.spawnParticles(me.x, me.y, '#60a5fa', 12);
          this.renderer.spawnFloatingText(me.x, me.y, 'BLOCK!', '#60a5fa');
        }
        break;
      }

      case 'missile': {
        dmg = Math.round(10 * shieldMod * blockMod * rageMod);
        en.hp = Math.max(0, en.hp - dmg);
        me.ult = Math.min(me.maxUlt || MAX_ULT, me.ult + (ACT_ULT.missile || 8));
        soundSystem.sfxHit(false);
        msg = `🔮 ${me.name} casts MAGIC MISSILE → ${dmg} dmg! (100% hit rate)${en.blocked ? ' (blocked 50%)' : ''}`;
        if (this.renderer) {
          this.renderer.spawnParticles(en.x, en.y, '#c084fc', 14);
          this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}🔮`, '#c084fc');
          this.renderer.shake(2);
        }
        break;
      }

      case 'fireball': {
        me.fireballCooldown = 2;
        const hit = Math.random() < 0.80;
        if (hit) {
          dmg = Math.round(25 * shieldMod * blockMod * rageMod);
          en.hp = Math.max(0, en.hp - dmg);
          me.ult = Math.min(me.maxUlt || MAX_ULT, me.ult + (ACT_ULT.fireball || 15));
          soundSystem.sfxFire();
          msg = `🔥 ${me.name} casts FIREBALL → ${dmg} dmg! (80% hit)${en.blocked ? ' (blocked 50%)' : ''}`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#f97316', 20);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}🔥`, '#f97316');
            this.renderer.shake(6);
          }
        } else {
          msg = `🔥 ${me.name} casts FIREBALL but misses! (80% hit rate)`;
          soundSystem.playTone(220, 'sawtooth', 0.2, 0.1);
          if (this.renderer) {
            this.renderer.spawnFloatingText(en.x, en.y, 'MISS! 🔥', '#f97316');
          }
        }
        break;
      }

      case 'wait': {
        me.ult = Math.min(me.maxUlt || MAX_ULT, me.ult + 2);
        msg = `⏳ ${me.name} waits and steadies their stance.`;
        break;
      }

      case 'attack':
        dmg = Math.round((me.atk + 3 + (Math.random() * 3 | 0)) * shieldMod * blockMod * rageMod * critMult);
        en.hp = Math.max(0, en.hp - dmg);
        me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.attack);
        soundSystem.sfxHit(isCrit);
        msg = `${me.name} attacks → ${dmg} dmg${isCrit ? ' 💥 CRIT!' : ''}${en.shield ? ' (shielded)' : ''}`;
        if (this.renderer) {
          this.renderer.spawnParticles(en.x, en.y, '#f87171', 8);
          this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}`, isCrit ? '#f59e0b' : '#ef4444');
          this.renderer.shake(isCrit ? 5 : 2);
        }
        break;

      case 'heavy':
        if (hasMp) {
          dmg = Math.round((me.atk + 9 + (Math.random() * 4 | 0)) * shieldMod * rageMod * critMult);
          en.hp = Math.max(0, en.hp - dmg);
          me.mp -= 3;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.heavy);
          soundSystem.sfxHit(true);
          msg = `${me.name} strikes with HEAVY BLOW → ${dmg} dmg${isCrit ? ' 💥 CRIT!' : ''}`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#fb923c', 14);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}`, '#fb923c');
            this.renderer.shake(6);
          }
        } else {
          dmg = Math.round(me.atk * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          msg = `${me.name} strikes (no MP) → ${dmg} dmg`;
          soundSystem.sfxHit(false);
        }
        break;

      case 'magic':
        if (hasMp) {
          dmg = Math.round((me.atk + 7 + (Math.random() * 3 | 0)) * shieldMod * rageMod);
          en.hp = Math.max(0, en.hp - dmg);
          en.burned = true;
          en.statusTurns.burn = 3;
          me.mp -= 4;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.magic);
          soundSystem.sfxFire();
          msg = `${me.name} casts 🔥 FIREBALL → ${dmg} dmg + BURN (3 turns)`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#f97316', 16);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}🔥`, '#f97316');
            this.renderer.shake(4);
          }
        } else {
          dmg = Math.round((me.atk + 2) * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          msg = `${me.name} casts weak spark → ${dmg} dmg`;
          soundSystem.sfxFire();
        }
        break;

      case 'drain':
        if (hasMp) {
          dmg = Math.round((me.atk + 5) * shieldMod * rageMod);
          en.hp = Math.max(0, en.hp - dmg);
          const healAmt = Math.round(dmg * 0.5);
          me.hp = Math.min(MAX_HP, me.hp + healAmt);
          me.mp -= 3;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.drain);
          soundSystem.sfxDrain();
          msg = `${me.name} casts 🩸 LIFE DRAIN → ${dmg} dmg, siphons +${healAmt} HP`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#a78bfa', 10);
            this.renderer.spawnParticles(me.x, me.y, '#34d399', 8);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg}`, '#a78bfa');
            this.renderer.spawnFloatingText(me.x, me.y, `+${healAmt}`, '#34d399');
          }
        } else {
          dmg = Math.round(me.atk * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          msg = `${me.name} drains feebly → ${dmg} dmg`;
        }
        break;

      case 'stun':
        if (hasMp) {
          dmg = Math.round((me.atk + 2) * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          en.stunned = true;
          en.statusTurns.stun = 2;
          me.mp -= 4;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.stun);
          soundSystem.sfxStun();
          msg = `${me.name} casts ⚡ STUN BOLT → ${dmg} dmg + 2 turns STUNNED`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#e879f9', 14);
            this.renderer.spawnFloatingText(en.x, en.y, 'STUN!', '#e879f9');
          }
        } else {
          dmg = Math.round(me.atk * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          msg = `${me.name} zaps with no MP → ${dmg} dmg`;
        }
        break;

      case 'poison':
        if (hasMp) {
          en.poisoned = true;
          en.statusTurns.poison = 5;
          me.mp -= 3;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.poison);
          soundSystem.sfxPoison();
          msg = `${me.name} flings ☠ POISON DART → 5 turns of 3 poison damage`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#4ade80', 12);
            this.renderer.spawnFloatingText(en.x, en.y, 'POISON', '#4ade80');
          }
        } else {
          dmg = Math.round(me.atk * shieldMod);
          en.hp = Math.max(0, en.hp - dmg);
          msg = `${me.name} thrusts → ${dmg} dmg`;
        }
        break;

      case 'rage':
        if (hasMp) {
          me.raging = true;
          me.statusTurns.rage = 4;
          me.mp -= 2;
          me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.rage);
          soundSystem.sfxRage();
          msg = `${me.name} activates 😤 BATTLE RAGE! (+35% damage for 4 turns)`;
          if (this.renderer) {
            this.renderer.spawnParticles(me.x, me.y, '#fca5a5', 12);
            this.renderer.spawnFloatingText(me.x, me.y, 'RAGE!', '#fca5a5');
          }
        }
        break;

      case 'shield':
        me.shield = true;
        me.statusTurns.shield = 3;
        me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.shield);
        soundSystem.sfxShield();
        msg = `${me.name} activates 🛡 AEGIS SHIELD (62% damage reduction for 3 turns)`;
        if (this.renderer) {
          this.renderer.spawnParticles(me.x, me.y, '#60a5fa', 10);
          this.renderer.spawnFloatingText(me.x, me.y, 'SHIELD', '#60a5fa');
        }
        break;

      case 'heal':
        const healAmt = Math.min(14, MAX_HP - me.hp);
        me.hp += healAmt;
        if (hasMp) me.mp -= 2;
        me.ult = Math.min(MAX_ULT, me.ult + ACT_ULT.heal);
        soundSystem.sfxHeal();
        msg = `${me.name} casts 💚 HOLY HEAL (+${healAmt} HP)`;
        if (this.renderer) {
          this.renderer.spawnParticles(me.x, me.y, '#34d399', 14);
          this.renderer.spawnFloatingText(me.x, me.y, `+${healAmt}`, '#34d399');
        }
        break;

      case 'ult':
        if (me.ult >= MAX_ULT) {
          dmg = Math.round((me.atk + 16) * rageMod);
          en.hp = Math.max(0, en.hp - dmg);
          en.shield = false; // Ultimate pierces shield
          me.ult = 0;
          soundSystem.sfxUlt();
          msg = `${me.name} invokes 🐉 DRAGON'S WRATH! → ${dmg} TRUE DAMAGE (Pierces Shield!)`;
          if (this.renderer) {
            this.renderer.spawnParticles(en.x, en.y, '#fde68a', 24);
            this.renderer.spawnParticles(me.x, me.y, '#f59e0b', 16);
            this.renderer.spawnFloatingText(en.x, en.y, `-${dmg} ULT!`, '#fde68a');
            this.renderer.shake(9);
          }
        }
        break;
    }

    this.log(msg, cls);

    // Apply tick damage
    if (en.poisoned) {
      en.hp = Math.max(0, en.hp - 3);
      en.statusTurns.poison--;
      if (en.statusTurns.poison <= 0) en.poisoned = false;
      this.log(`  ☠ poison deals 3 dmg to ${en.name}`, 'combat');
      if (this.renderer) this.renderer.spawnFloatingText(en.x, en.y, '-3 ☠', '#4ade80');
    }

    if (en.burned) {
      en.hp = Math.max(0, en.hp - 2);
      en.statusTurns.burn--;
      if (en.statusTurns.burn <= 0) en.burned = false;
      this.log(`  🔥 burn deals 2 dmg to ${en.name}`, 'combat');
      if (this.renderer) this.renderer.spawnFloatingText(en.x, en.y, '-2 🔥', '#f97316');
    }

    if (me.shield) {
      me.statusTurns.shield--;
      if (me.statusTurns.shield <= 0) {
        me.shield = false;
        this.log(`  🛡 ${me.name}'s shield fades`, 'combat');
      }
    }

    if (me.raging) {
      me.statusTurns.rage--;
      if (me.statusTurns.rage <= 0) {
        me.raging = false;
      }
    }

    me.mp = Math.min(MAX_MP, me.mp + 1);
    me.ult = Math.min(MAX_ULT, me.ult);
  }

  /**
   * End the current round.
   * @param {'h1'|'h2'|null} winnerKey  - which hero won, or null for draw
   * @param {string}         winBy      - WIN_BY_TREASURE or WIN_BY_COMBAT
   */
  endRound(winnerKey = null, winBy = WIN_BY_COMBAT) {
    this.phase = 'ended';
    clearTimeout(this.stepTimer);
    this.running = false;

    const [h1, h2] = this.heroes;

    // If called with no args, figure out from HP (backwards compat)
    if (!winnerKey) {
      if (h1.hp > 0 && h2.hp <= 0)      winnerKey = 'h1';
      else if (h2.hp > 0 && h1.hp <= 0) winnerKey = 'h2';
    }

    const winnerHero = winnerKey === 'h1' ? h1 : winnerKey === 'h2' ? h2 : null;

    if (winnerHero) {
      this.wins[winnerKey]++;

      const byLabel = winBy === WIN_BY_TREASURE
        ? '★ by claiming the Grand Treasure'
        : '⚔ by defeating the opponent in combat';
      this.log(`🏆 ${winnerHero.name} WINS THE ROUND ${byLabel}!`, 'system');

      soundSystem.sfxVictory();
      if (this.renderer) {
        this.renderer.spawnParticles(winnerHero.x, winnerHero.y, '#f59e0b', 30);
        this.renderer.spawnParticles(winnerHero.x, winnerHero.y, '#fde68a', 18);
        this.renderer.spawnFloatingText(winnerHero.x, winnerHero.y, '🏆 WINNER!', '#f59e0b');
      }

      if (typeof window !== 'undefined' && window.uiController && window.uiController.showDeclaration) {
        const decType = winBy === WIN_BY_TREASURE ? 'treasure' : 'victory';
        window.uiController.showDeclaration('🏆', `${winnerHero.name.toUpperCase()} WINS ROUND ${this.round}!`, byLabel, decType, 2600);
      }
    } else {
      this.log('⚔ ROUND ENDED IN A DRAW!', 'system');
      if (typeof window !== 'undefined' && window.uiController && window.uiController.showDeclaration) {
        window.uiController.showDeclaration('⚔', `ROUND ${this.round} DRAW!`, 'Evenly matched combatants', 'draw', 2200);
      }
    }

    const needed = Math.ceil(this.seriesBo / 2);
    if (this.wins.h1 >= needed || this.wins.h2 >= needed) {
      const champion = this.wins.h1 >= needed ? h1.name : h2.name;
      this.log(`👑 ${champion} WINS THE Bo${this.seriesBo} SERIES!`, 'system');
      if (typeof window !== 'undefined' && window.uiController && window.uiController.showDeclaration) {
        setTimeout(() => {
          window.uiController.showDeclaration('👑', `${champion.toUpperCase()} IS CHAMPION!`, `Victorious in Bo${this.seriesBo} Series (${this.wins.h1} - ${this.wins.h2})`, 'champion', 3600);
        }, 1200);
      }
    } else {
      this.round++;
    }

    if (this.onStateChange) this.onStateChange();
  }

  humanAction(act) {
    if (!this.humanWaiting) return;
    const hero = this.heroes[0];
    if (ACT_COST[act] > hero.mp) return;
    if (act === 'ult' && hero.ult < MAX_ULT) return;
    if (act === 'fireball' && hero.fireballCooldown > 0) return;

    this.humanChoice = act;
    this.humanWaiting = false;
    this.combatStep();

    if (this.running && !this.paused && !this.humanWaiting) {
      this.scheduleStep();
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.reset();
  }

  setSeries(bo) {
    this.seriesBo = parseInt(bo);
    this.reset();
  }

  setSpeed(speedVal) {
    this.speedMs = SPEED_MAP[speedVal] || 200;
    if (this.running && !this.paused) {
      clearTimeout(this.stepTimer);
      this.scheduleStep();
    }
  }

  getState() {
    return {
      dungeon: this.dungeon,
      heroes: this.heroes,
      items: this.items,
      goblins: this.goblins,
      combatRound: this.combatRound,
      maxCombatRounds: MAX_COMBAT_ROUNDS,
      phase: this.phase,
      round: this.round,
      wins: this.wins,
      seriesBo: this.seriesBo,
      mode: this.mode,
      paused: this.paused,
      running: this.running,
      combatTurn: this.combatTurn,
      humanWaiting: this.humanWaiting
    };
  }
}

// Global Game Engine instance
const gameEngine = new GameEngine();
