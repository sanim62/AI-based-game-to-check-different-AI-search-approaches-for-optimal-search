/**
 * AI Dungeon Duel — Ascension Edition
 * Combat Decision Intelligence Suite:
 * Minimax (Alpha-Beta), Expectimax, MCTS, Expert Systems (Berserker, Mage, Balanced), Random, & Custom Sandbox Runner
 */

class CombatAIEngine {
  constructor() {
    this.lastDecisionData = {
      action: 'attack',
      scores: {},
      heroName: '',
      algoName: '',
      timeMs: 0
    };
  }

  // State Evaluation Function
  evalState(me, en) {
    let s = (me.hp - en.hp) * 3.6;
    if (me.shield) s += 9;
    if (en.poisoned) s += 7;
    if (en.burned) s += 5;
    if (en.stunned) s += 12;
    if (me.stunned) s -= 14;
    if (me.raging) s += 8;
    if (en.shield) s -= 7;
    s += (me.ult / MAX_ULT) * 5.5;
    s -= (en.ult / MAX_ULT) * 3.5;
    if (me.hp <= 0) s -= 1000;
    if (en.hp <= 0) s += 1000;
    return s;
  }

  // Simulate an action in search tree
  simAct(me, en, act, deterministic = true, hitOutcome = null) {
    const a = { ...me, statusTurns: { ...me.statusTurns } };
    const b = { ...en, statusTurns: { ...en.statusTurns } };

    const shieldMod = b.shield ? 0.38 : 1.0;
    const blockMod = b.blocked ? 0.5 : 1.0;
    const rageMod = a.raging ? 1.35 : 1.0;
    const hasMp = a.mp >= (ACT_COST[act] !== undefined ? ACT_COST[act] : 0);
    const randSpread = deterministic ? 1.5 : Math.random() * 3;

    let dmg = 0;
    switch (act) {
      case 'slash': {
        const hit = hitOutcome !== null ? hitOutcome : (deterministic ? 0.9 : (Math.random() < 0.9 ? 1.0 : 0.0));
        dmg = Math.round(20 * hit * shieldMod * blockMod * rageMod);
        b.hp -= dmg;
        a.ult = (a.ult || 0) + (ACT_ULT.slash || 10);
        break;
      }
      case 'block': {
        a.blocked = true;
        if (!a.statusTurns) a.statusTurns = {};
        a.statusTurns.block = 1;
        a.ult = (a.ult || 0) + (ACT_ULT.block || 5);
        break;
      }
      case 'missile': {
        dmg = Math.round(10 * shieldMod * blockMod * rageMod);
        b.hp -= dmg;
        a.ult = (a.ult || 0) + (ACT_ULT.missile || 8);
        break;
      }
      case 'fireball': {
        const hit = hitOutcome !== null ? hitOutcome : (deterministic ? 0.8 : (Math.random() < 0.8 ? 1.0 : 0.0));
        dmg = Math.round(25 * hit * shieldMod * blockMod * rageMod);
        b.hp -= dmg;
        a.fireballCooldown = 2;
        a.ult = (a.ult || 0) + (ACT_ULT.fireball || 15);
        break;
      }
      case 'wait': {
        a.ult = (a.ult || 0) + (ACT_ULT.wait || 2);
        break;
      }
      case 'attack':
        dmg = Math.round((a.atk + 3 + randSpread) * shieldMod * blockMod * rageMod);
        b.hp -= dmg;
        a.ult += ACT_ULT.attack;
        break;
      case 'heavy':
        if (hasMp) {
          dmg = Math.round((a.atk + 9 + (deterministic ? 2 : Math.random() * 4)) * shieldMod * blockMod * rageMod);
          b.hp -= dmg;
          a.mp -= 3;
          a.ult += ACT_ULT.heavy;
        } else {
          dmg = Math.round((a.atk + 1) * shieldMod * blockMod);
          b.hp -= dmg;
        }
        break;
      case 'magic':
        if (hasMp) {
          dmg = Math.round((a.atk + 7 + randSpread) * shieldMod * blockMod * rageMod);
          b.hp -= dmg;
          b.burned = true;
          b.statusTurns.burn = 3;
          a.mp -= 4;
          a.ult += ACT_ULT.magic;
        } else {
          dmg = Math.round((a.atk + 2) * shieldMod * blockMod);
          b.hp -= dmg;
        }
        break;
      case 'drain':
        if (hasMp) {
          dmg = Math.round((a.atk + 5) * shieldMod * blockMod * rageMod);
          b.hp -= dmg;
          a.hp = Math.min(a.maxHp || MAX_HP, a.hp + Math.round(dmg * 0.5));
          a.mp -= 3;
          a.ult += ACT_ULT.drain;
        } else {
          dmg = Math.round(a.atk * shieldMod * blockMod);
          b.hp -= dmg;
        }
        break;
      case 'stun':
        if (hasMp) {
          b.stunned = true;
          b.statusTurns.stun = 2;
          dmg = Math.round((a.atk + 2) * shieldMod * blockMod);
          b.hp -= dmg;
          a.mp -= 4;
          a.ult += ACT_ULT.stun;
        } else {
          dmg = Math.round(a.atk * shieldMod * blockMod);
          b.hp -= dmg;
        }
        break;
      case 'poison':
        if (hasMp) {
          b.poisoned = true;
          b.statusTurns.poison = 5;
          a.mp -= 3;
          a.ult += ACT_ULT.poison;
        } else {
          dmg = Math.round(a.atk * shieldMod * blockMod);
          b.hp -= dmg;
        }
        break;
      case 'rage':
        if (hasMp) {
          a.raging = true;
          a.statusTurns.rage = 4;
          a.mp -= 2;
          a.ult += ACT_ULT.rage;
        }
        break;
      case 'shield':
        a.shield = true;
        a.statusTurns.shield = 3;
        a.ult += ACT_ULT.shield;
        break;
      case 'heal':
        const healAmt = Math.min(14, (a.maxHp || MAX_HP) - a.hp);
        a.hp += healAmt;
        if (hasMp) a.mp -= 2;
        a.ult += ACT_ULT.heal;
        break;
      case 'ult':
        if (a.ult >= MAX_ULT) {
          dmg = Math.round((a.atk + 16) * rageMod);
          b.hp -= dmg;
          b.shield = false; // Ultimate pierces shield
          a.ult = 0;
        }
        break;
    }

    // Status effect countdowns
    if (b.poisoned) {
      b.hp -= 3;
      b.statusTurns.poison--;
      if (b.statusTurns.poison <= 0) b.poisoned = false;
    }
    if (b.burned) {
      b.hp -= 2;
      b.statusTurns.burn--;
      if (b.statusTurns.burn <= 0) b.burned = false;
    }
    if (b.stunned) {
      b.statusTurns.stun--;
      if (b.statusTurns.stun <= 0) b.stunned = false;
    }
    if (a.shield) {
      a.statusTurns.shield--;
      if (a.statusTurns.shield <= 0) a.shield = false;
    }
    if (a.raging) {
      a.statusTurns.rage--;
      if (a.statusTurns.rage <= 0) a.raging = false;
    }

    a.mp = Math.min(MAX_MP, a.mp + 1);
    a.ult = Math.min(MAX_ULT, a.ult);
    a.hp = Math.max(0, a.hp);
    b.hp = Math.max(0, b.hp);

    return { a, b, damage: dmg };
  }

  // Filter legal actions
  getLegalActions(hero) {
    const pool = (hero.role && HERO_ROLES[hero.role])
      ? HERO_ROLES[hero.role].abilities
      : ['attack', 'heavy', 'magic', 'drain', 'stun', 'poison', 'rage', 'shield', 'heal', 'ult'];
    return pool.filter(act => {
      if (ACT_COST[act] > hero.mp) return false;
      if (act === 'ult' && hero.ult < MAX_ULT) return false;
      if (act === 'heal' && hero.hp >= (hero.maxHp || MAX_HP) * 0.8) return false;
      if (act === 'shield' && hero.shield) return false;
      if (act === 'block' && hero.blocked) return false;
      if (act === 'fireball' && hero.fireballCooldown > 0) return false;
      if (act === 'rage' && hero.raging) return false;
      return true;
    });
  }

  // 1. MINIMAX WITH ALPHA-BETA PRUNING
  minimax(me, en, depth, alpha, beta, isMax) {
    if (depth === 0 || me.hp <= 0 || en.hp <= 0) {
      return { score: this.evalState(me, en), scores: {} };
    }

    const scores = {};
    let best = isMax ? -Infinity : Infinity;
    let bestAct = 'attack';
    const legalActions = this.getLegalActions(isMax ? me : en);

    for (const act of legalActions) {
      const { a, b } = isMax ? this.simAct(me, en, act, true) : this.simAct(en, me, act, true);
      const child = isMax
        ? this.minimax(a, b, depth - 1, alpha, beta, false)
        : this.minimax(b, a, depth - 1, alpha, beta, true);

      scores[act] = Math.round(child.score * 10) / 10;

      if (isMax) {
        if (child.score > best) {
          best = child.score;
          bestAct = act;
        }
        alpha = Math.max(alpha, child.score);
      } else {
        if (child.score < best) {
          best = child.score;
          bestAct = act;
        }
        beta = Math.min(beta, child.score);
      }

      if (beta <= alpha) break;
    }

    return { score: best, action: bestAct, scores };
  }

  // 2. EXPECTIMAX SEARCH (Chance-aware planning)
  expectimax(me, en, depth, isMax) {
    if (depth === 0 || me.hp <= 0 || en.hp <= 0) {
      return { score: this.evalState(me, en), scores: {} };
    }

    const legalActions = this.getLegalActions(isMax ? me : en);
    const scores = {};

    if (isMax) {
      let maxScore = -Infinity;
      let bestAct = legalActions[0] || 'attack';

      for (const act of legalActions) {
        let expectedScore = 0;
        if (act === 'fireball') {
          // Fireball has 80% hit (25 dmg) and 20% miss (0 dmg)
          const hitRes = this.simAct(me, en, act, true, 1.0);
          const missRes = this.simAct(me, en, act, true, 0.0);
          const childHit = this.expectimax(hitRes.a, hitRes.b, depth - 1, false);
          const childMiss = this.expectimax(missRes.a, missRes.b, depth - 1, false);
          expectedScore = 0.8 * childHit.score + 0.2 * childMiss.score;
        } else if (act === 'slash') {
          // Slash has 90% hit (20 dmg) and 10% miss (0 dmg)
          const hitRes = this.simAct(me, en, act, true, 1.0);
          const missRes = this.simAct(me, en, act, true, 0.0);
          const childHit = this.expectimax(hitRes.a, hitRes.b, depth - 1, false);
          const childMiss = this.expectimax(missRes.a, missRes.b, depth - 1, false);
          expectedScore = 0.9 * childHit.score + 0.1 * childMiss.score;
        } else {
          const { a, b } = this.simAct(me, en, act, true);
          const child = this.expectimax(a, b, depth - 1, false);
          expectedScore = child.score;
        }

        scores[act] = Math.round(expectedScore * 10) / 10;

        if (expectedScore > maxScore) {
          maxScore = expectedScore;
          bestAct = act;
        }
      }
      return { score: maxScore, action: bestAct, scores };
    } else {
      // Chance node / Adversarial average expectation
      let expectedScore = 0;
      for (const act of legalActions) {
        let actScore = 0;
        if (act === 'fireball') {
          const hitRes = this.simAct(en, me, act, true, 1.0);
          const missRes = this.simAct(en, me, act, true, 0.0);
          const childHit = this.expectimax(hitRes.b, hitRes.a, depth - 1, true);
          const childMiss = this.expectimax(missRes.b, missRes.a, depth - 1, true);
          actScore = 0.8 * childHit.score + 0.2 * childMiss.score;
        } else if (act === 'slash') {
          const hitRes = this.simAct(en, me, act, true, 1.0);
          const missRes = this.simAct(en, me, act, true, 0.0);
          const childHit = this.expectimax(hitRes.b, hitRes.a, depth - 1, true);
          const childMiss = this.expectimax(missRes.b, missRes.a, depth - 1, true);
          actScore = 0.9 * childHit.score + 0.1 * childMiss.score;
        } else {
          const { a, b } = this.simAct(en, me, act, true);
          const child = this.expectimax(b, a, depth - 1, true);
          actScore = child.score;
        }
        expectedScore += actScore;
      }
      const avg = legalActions.length > 0 ? expectedScore / legalActions.length : 0;
      return { score: avg, action: 'attack', scores: {} };
    }
  }

  // 3. MONTE CARLO TREE SEARCH (MCTS)
  mcts(me, en, numRollouts = 80) {
    const legalActions = this.getLegalActions(me);
    if (!legalActions.length) return { action: 'attack', scores: {} };

    const scores = {};
    const winCounts = {};
    legalActions.forEach(a => {
      scores[a] = 0;
      winCounts[a] = 0;
    });

    const perActionRollouts = Math.max(8, Math.floor(numRollouts / legalActions.length));

    for (const act of legalActions) {
      let totalValue = 0;
      for (let r = 0; r < perActionRollouts; r++) {
        let { a: curMe, b: curEn } = this.simAct(me, en, act, false);
        let turns = 0;

        // Playout rollout
        while (curMe.hp > 0 && curEn.hp > 0 && turns < 8) {
          turns++;
          // Random opponent move
          const enLegal = this.getLegalActions(curEn);
          const enMove = enLegal[Math.floor(Math.random() * enLegal.length)] || 'attack';
          const res1 = this.simAct(curEn, curMe, enMove, false);
          curEn = res1.a;
          curMe = res1.b;

          if (curMe.hp <= 0 || curEn.hp <= 0) break;

          // Random self move
          const myLegal = this.getLegalActions(curMe);
          const myMove = myLegal[Math.floor(Math.random() * myLegal.length)] || 'attack';
          const res2 = this.simAct(curMe, curEn, myMove, false);
          curMe = res2.a;
          curEn = res2.b;
        }

        const terminalEval = this.evalState(curMe, curEn);
        totalValue += terminalEval;
        if (curMe.hp > curEn.hp) winCounts[act]++;
      }
      scores[act] = Math.round((totalValue / perActionRollouts) * 10) / 10;
    }

    let bestAct = legalActions[0];
    let bestScore = -Infinity;
    for (const act of legalActions) {
      if (scores[act] > bestScore) {
        bestScore = scores[act];
        bestAct = act;
      }
    }

    return { action: bestAct, scores };
  }

  // 4. EXPERT SYSTEM: BERSERKER AGGRO
  expertBerserker(me, en) {
    const scores = {};
    ACTIONS.forEach(a => (scores[a] = 0));

    if (me.ult >= MAX_ULT) {
      scores['ult'] = 100;
      return { action: 'ult', scores };
    }
    if (me.mp >= 2 && !me.raging) {
      scores['rage'] = 85;
      return { action: 'rage', scores };
    }
    if (me.mp >= 3) {
      scores['heavy'] = 75;
      return { action: 'heavy', scores };
    }
    if (me.mp >= 4) {
      scores['magic'] = 70;
      return { action: 'magic', scores };
    }
    scores['attack'] = 50;
    return { action: 'attack', scores };
  }

  // 5. EXPERT SYSTEM: CONTROL MAGE
  expertMage(me, en) {
    const scores = {};
    ACTIONS.forEach(a => (scores[a] = 0));

    if (me.hp <= MAX_HP * 0.4 && me.mp >= 2) {
      scores['heal'] = 95;
      return { action: 'heal', scores };
    }
    if (!en.stunned && me.mp >= 4) {
      scores['stun'] = 90;
      return { action: 'stun', scores };
    }
    if (!me.shield) {
      scores['shield'] = 80;
      return { action: 'shield', scores };
    }
    if (!en.poisoned && me.mp >= 3) {
      scores['poison'] = 75;
      return { action: 'poison', scores };
    }
    if (me.hp <= MAX_HP * 0.75 && me.mp >= 3) {
      scores['drain'] = 70;
      return { action: 'drain', scores };
    }
    if (me.mp >= 4) {
      scores['magic'] = 65;
      return { action: 'magic', scores };
    }
    scores['attack'] = 40;
    return { action: 'attack', scores };
  }

  // 6. EXPERT SYSTEM: BALANCED TACTICIAN
  expertBalanced(me, en) {
    const scores = {};
    ACTIONS.forEach(a => (scores[a] = 0));

    if (me.ult >= MAX_ULT) return { action: 'ult', scores: { ult: 100 } };
    if (me.hp < 12 && me.mp >= 2) return { action: 'heal', scores: { heal: 90 } };
    if (!me.shield && en.hp > 15) return { action: 'shield', scores: { shield: 85 } };
    if (!en.poisoned && me.mp >= 3) return { action: 'poison', scores: { poison: 80 } };
    if (me.mp >= 3 && me.hp < 20) return { action: 'drain', scores: { drain: 75 } };
    if (me.mp >= 3) return { action: 'heavy', scores: { heavy: 70 } };
    return { action: 'attack', scores: { attack: 50 } };
  }

  // 7. RANDOM BASELINE
  randomAction(me) {
    const legal = this.getLegalActions(me);
    const act = legal[Math.floor(Math.random() * legal.length)] || 'attack';
    const scores = {};
    legal.forEach(a => (scores[a] = a === act ? 10 : 0));
    return { action: act, scores };
  }

  // 8. CUSTOM USER COMBAT ALGORITHM RUNNER
  runCustom(customFn, me, en) {
    const t0 = performance.now();
    try {
      const chosen = customFn({
        me: { ...me, statusTurns: { ...me.statusTurns } },
        enemy: { ...en, statusTurns: { ...en.statusTurns } },
        actions: [...ACTIONS],
        actionCosts: { ...ACT_COST },
        actionUlt: { ...ACT_ULT },
        legalActions: this.getLegalActions(me),
        simAct: (a, b, act) => this.simAct(a, b, act),
        evalState: (a, b) => this.evalState(a, b)
      });

      if (typeof chosen === 'string' && ACTIONS.includes(chosen.toLowerCase())) {
        const act = chosen.toLowerCase();
        // Check affordability
        if (ACT_COST[act] <= me.mp && (act !== 'ult' || me.ult >= MAX_ULT)) {
          const scores = {};
          scores[act] = 100;
          return { action: act, scores, customSuccess: true };
        }
      }
    } catch (err) {
      console.warn('Custom combat algorithm execution error:', err);
    }
    // Safe fallback to Minimax Depth 4
    return this.minimax(me, en, 4, -Infinity, Infinity, true);
  }

  // Unified Combat Dispatcher
  decideAction(algoId, me, en, customFn = null) {
    const t0 = performance.now();
    let result = null;

    switch (algoId) {
      case 'minimax_4':
        result = this.minimax(me, en, 4, -Infinity, Infinity, true);
        break;
      case 'minimax_2':
        result = this.minimax(me, en, 2, -Infinity, Infinity, true);
        break;
      case 'expectimax':
        result = this.expectimax(me, en, 3, true);
        break;
      case 'mcts':
        result = this.mcts(me, en, 80);
        break;
      case 'rule_berserk':
        result = this.expertBerserker(me, en);
        break;
      case 'rule_mage':
        result = this.expertMage(me, en);
        break;
      case 'rule_balanced':
        result = this.expertBalanced(me, en);
        break;
      case 'random':
        result = this.randomAction(me);
        break;
      case 'custom_combat':
        result = customFn ? this.runCustom(customFn, me, en) : this.minimax(me, en, 4, -Infinity, Infinity, true);
        break;
      default:
        result = this.minimax(me, en, 4, -Infinity, Infinity, true);
        break;
    }

    const elapsed = Math.max(0.01, performance.now() - t0);
    this.lastDecisionData = {
      action: result.action || 'attack',
      scores: result.scores || {},
      heroName: me.name,
      algoName: algoId,
      timeMs: elapsed
    };

    return {
      action: result.action || 'attack',
      scores: result.scores || {},
      timeMs: elapsed
    };
  }
}

// Global Combat AI singleton
const combatAIEngine = new CombatAIEngine();
