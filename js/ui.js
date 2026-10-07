/**
 * AI Dungeon Duel — Ascension Edition
 * UI Controller: Tab Switching, Live HUD, Minimax Visualizer, Benchmark Dashboard, & Custom Studio
 */

class UIController {
  constructor() {
    this.activeTab = 'arena';
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.populateAlgorithmSelects();
    this.bindEvents();
    this.updateHUD();
    this.updateCustomEditor();
  }

  cacheElements() {
    this.elements = {
      // Tab Buttons
      tabBtns: document.querySelectorAll('.nav-tab'),
      tabViews: document.querySelectorAll('.tab-view'),

      // Hero Cards
      h1Name: document.getElementById('h1Name'),
      h2Name: document.getElementById('h2Name'),
      h1Hp: document.getElementById('h1Hp'),
      h2Hp: document.getElementById('h2Hp'),
      h1MaxHp: document.getElementById('h1MaxHp'),
      h2MaxHp: document.getElementById('h2MaxHp'),
      h1Mp: document.getElementById('h1Mp'),
      h2Mp: document.getElementById('h2Mp'),
      h1Atk: document.getElementById('h1Atk'),
      h2Atk: document.getElementById('h2Atk'),
      h1Ult: document.getElementById('h1Ult'),
      h2Ult: document.getElementById('h2Ult'),
      hpBar1: document.getElementById('hpBar1'),
      hpBar2: document.getElementById('hpBar2'),
      mpBar1: document.getElementById('mpBar1'),
      mpBar2: document.getElementById('mpBar2'),
      ultBar1: document.getElementById('ultBar1'),
      ultBar2: document.getElementById('ultBar2'),
      tags1: document.getElementById('tags1'),
      tags2: document.getElementById('tags2'),
      card1: document.getElementById('card1'),
      card2: document.getElementById('card2'),

      // Match Mid Card
      roundNum: document.getElementById('roundNum'),
      winsDisp: document.getElementById('winsDisp'),
      seriesDisp: document.getElementById('seriesDisp'),
      goblinsDisp: document.getElementById('goblinsDisp'),

      // Arena Controls & HUD
      phaseBadge: document.getElementById('phaseBadge'),
      logBox: document.getElementById('logBox'),
      mmTitle: document.getElementById('mmTitle'),
      mmRows: document.getElementById('mmRows'),
      actionBar: document.getElementById('actionBar'),
      hintLbl: document.getElementById('hintLbl'),
      actionBtnsContainer: document.getElementById('actionBtnsContainer'),

      startBtn: document.getElementById('startBtn'),
      pauseBtn: document.getElementById('pauseBtn'),
      stepBtn: document.getElementById('stepBtn'),
      resetBtn: document.getElementById('resetBtn'),
      muteBtn: document.getElementById('muteBtn'),
      speedSlider: document.getElementById('speedSlider'),
      speedLbl: document.getElementById('speedLbl'),
      seriesSel: document.getElementById('seriesSel'),
      footprintToggle: document.getElementById('footprintToggle'),

      // Algorithm Selectors in Arena
      h1PathSel: document.getElementById('h1PathSel'),
      h1CombatSel: document.getElementById('h1CombatSel'),
      h2PathSel: document.getElementById('h2PathSel'),
      h2CombatSel: document.getElementById('h2CombatSel'),

      // Benchmark Elements
      bmRounds: document.getElementById('bmRounds'),
      bmH1Combat: document.getElementById('bmH1Combat'),
      bmH1Path: document.getElementById('bmH1Path'),
      bmH2Combat: document.getElementById('bmH2Combat'),
      bmH2Path: document.getElementById('bmH2Path'),
      bmRunBtn: document.getElementById('bmRunBtn'),
      bmCancelBtn: document.getElementById('bmCancelBtn'),
      bmProgressWrap: document.getElementById('bmProgressWrap'),
      bmProgressBar: document.getElementById('bmProgressBar'),
      bmProgressText: document.getElementById('bmProgressText'),
      bmResultsContainer: document.getElementById('bmResultsContainer'),

      // Custom Code Studio Elements
      studioTypeSel: document.getElementById('studioTypeSel'),
      studioPresetSel: document.getElementById('studioPresetSel'),
      studioCodeArea: document.getElementById('studioCodeArea'),
      studioValidateBtn: document.getElementById('studioValidateBtn'),
      studioDeployH1Btn: document.getElementById('studioDeployH1Btn'),
      studioDeployH2Btn: document.getElementById('studioDeployH2Btn'),
      studioConsole: document.getElementById('studioConsole')
    };
  }

  populateAlgorithmSelects() {
    const fillSelect = (selectElem, catalog, defaultId) => {
      if (!selectElem) return;
      selectElem.innerHTML = '';
      catalog.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        if (item.id === defaultId) opt.selected = true;
        selectElem.appendChild(opt);
      });
    };

    // Arena Selects
    fillSelect(this.elements.h1PathSel, PATHFINDING_ALGORITHMS, 'astar');
    fillSelect(this.elements.h1CombatSel, COMBAT_ALGORITHMS, 'minimax_4');
    fillSelect(this.elements.h2PathSel, PATHFINDING_ALGORITHMS, 'astar');
    fillSelect(this.elements.h2CombatSel, COMBAT_ALGORITHMS, 'expectimax');

    // Benchmark Selects
    fillSelect(this.elements.bmH1Path, PATHFINDING_ALGORITHMS, 'astar');
    fillSelect(this.elements.bmH1Combat, COMBAT_ALGORITHMS, 'minimax_4');
    fillSelect(this.elements.bmH2Path, PATHFINDING_ALGORITHMS, 'astar');
    fillSelect(this.elements.bmH2Combat, COMBAT_ALGORITHMS, 'expectimax');
  }

  bindEvents() {
    // Navigation Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
        soundSystem.sfxClick();
      });
    });

    // Arena Buttons
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        if (gameEngine.phase === 'ended') {
          gameEngine.initMatch();
        }
        gameEngine.start();
      });
    }

    if (this.elements.pauseBtn) {
      this.elements.pauseBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        gameEngine.pause();
      });
    }

    if (this.elements.stepBtn) {
      this.elements.stepBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        gameEngine.stepOnce();
      });
    }

    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        gameEngine.reset();
        this.clearLogs();
      });
    }

    if (this.elements.muteBtn) {
      this.elements.muteBtn.addEventListener('click', () => {
        const isMuted = soundSystem.toggleMute();
        this.elements.muteBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    if (this.elements.speedSlider) {
      this.elements.speedSlider.addEventListener('input', e => {
        const val = e.target.value;
        this.elements.speedLbl.textContent = SPEED_NAMES[val] || 'Normal';
        gameEngine.setSpeed(val);
      });
    }

    if (this.elements.seriesSel) {
      this.elements.seriesSel.addEventListener('change', e => {
        gameEngine.setSeries(e.target.value);
      });
    }

    if (this.elements.footprintToggle) {
      this.elements.footprintToggle.addEventListener('change', e => {
        if (gameEngine.renderer) {
          gameEngine.renderer.showSearchFootprint = e.target.checked;
        }
      });
    }

    // Algorithm Change Handlers in Arena
    const syncAlgo = () => {
      if (this.elements.h1PathSel) gameEngine.h1PathAlgo = this.elements.h1PathSel.value;
      if (this.elements.h1CombatSel) gameEngine.h1CombatAlgo = this.elements.h1CombatSel.value;
      if (this.elements.h2PathSel) gameEngine.h2PathAlgo = this.elements.h2PathSel.value;
      if (this.elements.h2CombatSel) gameEngine.h2CombatAlgo = this.elements.h2CombatSel.value;

      if (gameEngine.heroes.length >= 2) {
        gameEngine.heroes[0].pathAlgoId = gameEngine.h1PathAlgo;
        gameEngine.heroes[0].combatAlgoId = gameEngine.h1CombatAlgo;
        gameEngine.heroes[1].pathAlgoId = gameEngine.h2PathAlgo;
        gameEngine.heroes[1].combatAlgoId = gameEngine.h2CombatAlgo;
      }
      this.updateHUD();
    };

    [this.elements.h1PathSel, this.elements.h1CombatSel, this.elements.h2PathSel, this.elements.h2CombatSel].forEach(sel => {
      if (sel) sel.addEventListener('change', syncAlgo);
    });

    // Keyboard Shortcuts for Human Combat
    document.addEventListener('keydown', e => {
      if (!gameEngine.humanWaiting) return;
      const hero = gameEngine.heroes[0];
      const keyMap = {
        s: hero && hero.role === 'warrior' ? 'slash' : 'shield',
        b: 'block',
        m: 'missile',
        f: 'fireball',
        w: 'wait',
        a: 'attack',
        h: 'heavy',
        d: 'drain',
        t: 'stun',
        p: 'poison',
        r: 'rage',
        e: 'heal',
        u: 'ult'
      };
      const act = keyMap[e.key.toLowerCase()];
      if (act) {
        e.preventDefault();
        gameEngine.humanAction(act);
      }
    });

    // Custom Code Studio Events
    this.bindStudioEvents();

    // Benchmark Events
    this.bindBenchmarkEvents();

    // Engine Observers
    gameEngine.onStateChange = () => this.updateHUD();
    gameEngine.onLogMessage = (msg, type) => this.addLog(msg, type);
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.elements.tabViews.forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });
  }

  updateHUD() {
    const state = gameEngine.getState();
    const heroes = state.heroes;
    if (!heroes || heroes.length < 2) return;

    const [h1, h2] = heroes;

    // Names & Stats
    if (this.elements.h1Name) this.elements.h1Name.textContent = h1.name;
    if (this.elements.h2Name) this.elements.h2Name.textContent = h2.name;

    if (this.elements.h1Hp) this.elements.h1Hp.textContent = h1.hp;
    if (this.elements.h2Hp) this.elements.h2Hp.textContent = h2.hp;
    if (this.elements.h1MaxHp) this.elements.h1MaxHp.textContent = h1.maxHp || 100;
    if (this.elements.h2MaxHp) this.elements.h2MaxHp.textContent = h2.maxHp || 70;
    if (this.elements.h1Mp) this.elements.h1Mp.textContent = h1.mp;
    if (this.elements.h2Mp) this.elements.h2Mp.textContent = h2.mp;
    if (this.elements.h1Atk) this.elements.h1Atk.textContent = h1.atk;
    if (this.elements.h2Atk) this.elements.h2Atk.textContent = h2.atk;
    if (this.elements.h1Ult) this.elements.h1Ult.textContent = h1.ult;
    if (this.elements.h2Ult) this.elements.h2Ult.textContent = h2.ult;

    // Bars (relative to each hero's maxHp)
    const maxHp1 = h1.maxHp || 100;
    const maxHp2 = h2.maxHp || 70;
    if (this.elements.hpBar1) this.elements.hpBar1.style.width = `${Math.max(0, (h1.hp / maxHp1) * 100)}%`;
    if (this.elements.hpBar2) this.elements.hpBar2.style.width = `${Math.max(0, (h2.hp / maxHp2) * 100)}%`;
    if (this.elements.mpBar1) this.elements.mpBar1.style.width = `${Math.max(0, (h1.mp / MAX_MP) * 100)}%`;
    if (this.elements.mpBar2) this.elements.mpBar2.style.width = `${Math.max(0, (h2.mp / MAX_MP) * 100)}%`;
    if (this.elements.ultBar1) this.elements.ultBar1.style.width = `${Math.max(0, (h1.ult / MAX_ULT) * 100)}%`;
    if (this.elements.ultBar2) this.elements.ultBar2.style.width = `${Math.max(0, (h2.ult / MAX_ULT) * 100)}%`;

    // Status Tags
    this.renderStatusTags(this.elements.tags1, h1);
    this.renderStatusTags(this.elements.tags2, h2);

    // Active Card Turn Glow
    if (this.elements.card1) {
      this.elements.card1.classList.toggle('active-turn', state.phase === 'combat' && state.combatTurn === 0);
    }
    if (this.elements.card2) {
      this.elements.card2.classList.toggle('active-turn', state.phase === 'combat' && state.combatTurn === 1);
    }

    // Mid Card
    const roundTxt = state.phase === 'combat'
      ? `R${state.round} · T${state.combatRound || 1}/40`
      : `R${state.round}`;
    if (this.elements.roundNum) this.elements.roundNum.textContent = roundTxt;
    if (this.elements.winsDisp) this.elements.winsDisp.innerHTML = `${state.wins.h1} – ${state.wins.h2}`;
    if (this.elements.seriesDisp) this.elements.seriesDisp.textContent = `Bo${state.seriesBo}`;

    if (this.elements.goblinsDisp) {
      const liveGobs = state.goblins ? state.goblins.filter(g => g.alive).length : 0;
      this.elements.goblinsDisp.textContent = `👺 ${liveGobs} Goblin${liveGobs === 1 ? '' : 's'}`;
    }

    // Phase Badge
    if (this.elements.phaseBadge) {
      this.elements.phaseBadge.className = `phase-badge ${state.phase}`;
      if (state.phase === 'explore') {
        const p1Algo = PATHFINDING_ALGORITHMS.find(a => a.id === h1.pathAlgoId)?.name || 'A*';
        const p2Algo = PATHFINDING_ALGORITHMS.find(a => a.id === h2.pathAlgoId)?.name || 'A*';
        this.elements.phaseBadge.textContent = `🗺 DUNGEON EXPLORATION · [${p1Algo}] vs [${p2Algo}]`;
      } else if (state.phase === 'combat') {
        this.elements.phaseBadge.textContent = `⚔ COMBAT ARENA · Turn: ${state.combatTurn === 0 ? h1.name : h2.name} (Round ${state.combatRound || 1}/40)`;
      } else {
        this.elements.phaseBadge.textContent = `🏆 ROUND FINISHED`;
      }
    }

    // Controls Buttons
    if (this.elements.startBtn) {
      if (state.running) {
        this.elements.startBtn.disabled = true;
      } else {
        this.elements.startBtn.disabled = false;
        this.elements.startBtn.textContent = state.phase === 'ended' ? '▶ Next Round' : '▶ Start Duel';
      }
    }

    if (this.elements.pauseBtn) {
      this.elements.pauseBtn.disabled = !state.running;
      this.elements.pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
    }

    // Minimax / Decision Scores Panel
    this.renderMinimaxScores();

    // Human Move Action Bar
    this.renderHumanActionBar();
  }

  renderStatusTags(container, hero) {
    if (!container) return;
    container.innerHTML = '';
    if (hero.blocked) container.innerHTML += `<span class="stag shield">🛡 BLOCK (50%)</span>`;
    if (hero.fireballCooldown > 0) container.innerHTML += `<span class="stag burn">⌛ FIREBALL CD (${hero.fireballCooldown})</span>`;
    if (hero.shield) container.innerHTML += `<span class="stag shield">🛡 SHIELD (${hero.statusTurns.shield})</span>`;
    if (hero.poisoned) container.innerHTML += `<span class="stag poison">☠ POISON (${hero.statusTurns.poison})</span>`;
    if (hero.burned) container.innerHTML += `<span class="stag burn">🔥 BURN (${hero.statusTurns.burn})</span>`;
    if (hero.stunned) container.innerHTML += `<span class="stag stun">⚡ STUN (${hero.statusTurns.stun})</span>`;
    if (hero.raging) container.innerHTML += `<span class="stag rage">😤 RAGE (${hero.statusTurns.rage})</span>`;
  }

  renderMinimaxScores() {
    if (!this.elements.mmRows) return;
    const lastData = combatAIEngine.lastDecisionData;

    if (!lastData || !Object.keys(lastData.scores).length) {
      this.elements.mmRows.innerHTML = '<div class="empty-hint">Waiting for combat decisions...</div>';
      if (this.elements.mmTitle) this.elements.mmTitle.textContent = 'ALGORITHM DECISION MATRIX';
      return;
    }

    const scores = lastData.scores;
    const vals = Object.values(scores);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const range = maxVal - minVal || 1;

    if (this.elements.mmTitle) {
      this.elements.mmTitle.textContent = `${lastData.heroName} [${lastData.algoName.toUpperCase()}] → ${lastData.action.toUpperCase()} (${lastData.timeMs.toFixed(2)}ms)`;
    }

    this.elements.mmRows.innerHTML = '';
    for (const [act, score] of Object.entries(scores)) {
      const pct = Math.max(8, Math.round(((score - minVal) / range) * 100));
      const isChosen = act === lastData.action;
      const actColor = ACTION_INFO[act]?.color || '#8b5cf6';

      const row = document.createElement('div');
      row.className = 'mm-row';
      row.innerHTML = `
        <div class="mm-lbl">${act}</div>
        <div class="mm-bar-bg">
          <div class="mm-bar-fill" style="width: ${pct}%; background: ${actColor}; opacity: ${isChosen ? 1 : 0.45}"></div>
        </div>
        <div class="mm-val">${score}</div>
        <div class="mm-status">${isChosen ? '✓ CHOSEN' : ''}</div>
      `;
      this.elements.mmRows.appendChild(row);
    }
  }

  renderHumanActionBar() {
    if (!this.elements.actionBar) return;
    const state = gameEngine.getState();
    const show = state.mode === 'human' && state.phase === 'combat' && state.combatTurn === 0 && state.humanWaiting;

    this.elements.actionBar.style.display = show ? 'block' : 'none';
    if (!show) return;

    const hero = state.heroes[0];
    const enemy = state.heroes[1];

    // Compute hint using Hero's configured combat algo
    const hintRes = combatAIEngine.decideAction(hero.combatAlgoId || 'minimax_4', hero, enemy);
    const hintAct = hintRes.action;

    if (this.elements.hintLbl) {
      const hintKey = ACTION_INFO[hintAct]?.key ? ` [${ACTION_INFO[hintAct].key}]` : '';
      this.elements.hintLbl.textContent = `AI Recommends: ${hintAct.toUpperCase()}${hintKey}`;
    }

    if (this.elements.actionBtnsContainer) {
      this.elements.actionBtnsContainer.innerHTML = '';
      const legalActions = hero.role === 'warrior'
        ? ['slash', 'block', 'wait', 'attack', 'heavy', 'shield', 'ult']
        : hero.role === 'mage'
        ? ['missile', 'fireball', 'wait', 'attack', 'magic', 'shield', 'ult']
        : ACTIONS;

      legalActions.forEach(act => {
        const info = ACTION_INFO[act] || { name: act, key: '', mpCost: 0 };
        const canAfford = hero.mp >= (info.mpCost || 0);
        const canUlt = act !== 'ult' || hero.ult >= (hero.maxUlt || MAX_ULT);
        const onCooldown = act === 'fireball' && hero.fireballCooldown > 0;
        const disabled = !canAfford || !canUlt || onCooldown;
        const isHint = act === hintAct;

        const btn = document.createElement('button');
        btn.className = `abtn ${isHint ? 'hint-best' : ''}`;
        btn.disabled = disabled;

        let costLabel = '';
        if (onCooldown) costLabel = `CD: ${hero.fireballCooldown}`;
        else if (info.mpCost > 0) costLabel = `${info.mpCost} MP`;
        else if (act === 'ult') costLabel = '100 ULT';

        btn.innerHTML = `
          <span>${info.name}</span>
          <span class="akey">[${info.key || ''}]</span>
          <span class="acost">${costLabel}</span>
        `;
        btn.addEventListener('click', () => {
          soundSystem.sfxClick();
          gameEngine.humanAction(act);
        });
        this.elements.actionBtnsContainer.appendChild(btn);
      });
    }
  }

  addLog(msg, type = 'combat') {
    if (!this.elements.logBox) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = msg;
    this.elements.logBox.appendChild(entry);
    this.elements.logBox.scrollTop = this.elements.logBox.scrollHeight;
  }

  clearLogs() {
    if (this.elements.logBox) {
      this.elements.logBox.innerHTML = '';
    }
  }

  // ═══ CUSTOM CODE STUDIO ═════════════════════════════════
  bindStudioEvents() {
    if (this.elements.studioTypeSel) {
      this.elements.studioTypeSel.addEventListener('change', () => {
        this.updateCustomEditor();
      });
    }

    if (this.elements.studioPresetSel) {
      this.elements.studioPresetSel.addEventListener('change', e => {
        const val = e.target.value;
        if (!val) return;
        const presetCode = customSandbox.getPreset(val);
        if (presetCode && this.elements.studioCodeArea) {
          this.elements.studioCodeArea.value = presetCode;
        }
      });
    }

    if (this.elements.studioValidateBtn) {
      this.elements.studioValidateBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        this.validateCustomCode();
      });
    }

    if (this.elements.studioDeployH1Btn) {
      this.elements.studioDeployH1Btn.addEventListener('click', () => {
        soundSystem.sfxClick();
        this.deployCustomCode(0);
      });
    }

    if (this.elements.studioDeployH2Btn) {
      this.elements.studioDeployH2Btn.addEventListener('click', () => {
        soundSystem.sfxClick();
        this.deployCustomCode(1);
      });
    }
  }

  updateCustomEditor() {
    const type = this.elements.studioTypeSel ? this.elements.studioTypeSel.value : 'combat';
    if (!this.elements.studioCodeArea) return;

    if (type === 'combat') {
      this.elements.studioCodeArea.value = customSandbox.combatCustomCode;
    } else {
      this.elements.studioCodeArea.value = customSandbox.pathCustomCode;
    }
  }

  validateCustomCode() {
    const type = this.elements.studioTypeSel ? this.elements.studioTypeSel.value : 'combat';
    const code = this.elements.studioCodeArea ? this.elements.studioCodeArea.value : '';
    const consoleBox = this.elements.studioConsole;

    if (type === 'combat') {
      const res = customSandbox.compileCombat(code);
      if (res.success) {
        consoleBox.className = 'studio-console success';
        consoleBox.innerHTML = `<strong>✔ SUCCESS:</strong> ${res.message}<br><small>Ready to deploy into combat simulation.</small>`;
      } else {
        consoleBox.className = 'studio-console error';
        consoleBox.innerHTML = `<strong>✖ VALIDATION FAILED:</strong> ${res.error}`;
      }
    } else {
      const res = customSandbox.compilePath(code);
      if (res.success) {
        consoleBox.className = 'studio-console success';
        consoleBox.innerHTML = `<strong>✔ SUCCESS:</strong> ${res.message}<br><small>Ready to deploy into dungeon navigation.</small>`;
      } else {
        consoleBox.className = 'studio-console error';
        consoleBox.innerHTML = `<strong>✖ VALIDATION FAILED:</strong> ${res.error}`;
      }
    }
  }

  deployCustomCode(heroIndex) {
    this.validateCustomCode();
    const type = this.elements.studioTypeSel ? this.elements.studioTypeSel.value : 'combat';
    const heroName = heroIndex === 0 ? 'Hero 1 (Astra)' : 'Hero 2 (Vex)';

    if (type === 'combat') {
      if (heroIndex === 0) {
        gameEngine.h1CombatAlgo = 'custom_combat';
        if (this.elements.h1CombatSel) this.elements.h1CombatSel.value = 'custom_combat';
      } else {
        gameEngine.h2CombatAlgo = 'custom_combat';
        if (this.elements.h2CombatSel) this.elements.h2CombatSel.value = 'custom_combat';
      }
    } else {
      if (heroIndex === 0) {
        gameEngine.h1PathAlgo = 'custom_path';
        if (this.elements.h1PathSel) this.elements.h1PathSel.value = 'custom_path';
      } else {
        gameEngine.h2PathAlgo = 'custom_path';
        if (this.elements.h2PathSel) this.elements.h2PathSel.value = 'custom_path';
      }
    }

    if (gameEngine.heroes.length >= 2) {
      gameEngine.heroes[heroIndex].combatAlgoId = heroIndex === 0 ? gameEngine.h1CombatAlgo : gameEngine.h2CombatAlgo;
      gameEngine.heroes[heroIndex].pathAlgoId = heroIndex === 0 ? gameEngine.h1PathAlgo : gameEngine.h2PathAlgo;
    }

    this.elements.studioConsole.innerHTML += `<br><span style="color:#10b981">🚀 Deployed to ${heroName} successfully! Switch to Arena Duel to test it!</span>`;
    soundSystem.sfxItem('power');
  }

  // ═══ BENCHMARK LAB ═══════════════════════════════════════
  bindBenchmarkEvents() {
    if (this.elements.bmRunBtn) {
      this.elements.bmRunBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        this.runBenchmark();
      });
    }

    if (this.elements.bmCancelBtn) {
      this.elements.bmCancelBtn.addEventListener('click', () => {
        soundSystem.sfxClick();
        benchmarkEngine.cancel();
      });
    }
  }

  async runBenchmark() {
    const rounds = parseInt(this.elements.bmRounds?.value || '50');
    const h1Combat = this.elements.bmH1Combat?.value || 'minimax_4';
    const h1Path = this.elements.bmH1Path?.value || 'astar';
    const h2Combat = this.elements.bmH2Combat?.value || 'minimax_2';
    const h2Path = this.elements.bmH2Path?.value || 'astar';

    const h1CombName = COMBAT_ALGORITHMS.find(a => a.id === h1Combat)?.name || h1Combat;
    const h2CombName = COMBAT_ALGORITHMS.find(a => a.id === h2Combat)?.name || h2Combat;

    this.elements.bmRunBtn.disabled = true;
    this.elements.bmCancelBtn.disabled = false;
    this.elements.bmProgressWrap.style.display = 'block';
    this.elements.bmResultsContainer.innerHTML = '<div class="bm-loading">Running high-speed headless simulations...</div>';

    const onProgress = (current, total, interim) => {
      if (this.elements.bmProgressBar) {
        this.elements.bmProgressBar.style.width = `${interim.pct}%`;
      }
      if (this.elements.bmProgressText) {
        this.elements.bmProgressText.textContent = `Completed ${current}/${total} rounds (${interim.pct}%) · Hero 1: ${interim.h1Wins}W | Hero 2: ${interim.h2Wins}W | Draws: ${interim.draws}`;
      }
    };

    const onComplete = report => {
      this.elements.bmRunBtn.disabled = false;
      this.elements.bmCancelBtn.disabled = true;
      this.renderBenchmarkResults(report);
      soundSystem.sfxVictory();
    };

    await benchmarkEngine.runBenchmark(
      {
        numRounds: rounds,
        hero1Name: `Hero 1 (${h1CombName})`,
        hero2Name: `Hero 2 (${h2CombName})`,
        hero1PathAlgo: h1Path,
        hero1CombatAlgo: h1Combat,
        hero2PathAlgo: h2Path,
        hero2CombatAlgo: h2Combat
      },
      onProgress,
      onComplete
    );
  }

  renderBenchmarkResults(r) {
    if (!this.elements.bmResultsContainer) return;

    this.elements.bmResultsContainer.innerHTML = `
      <div class="bm-card">
        <div class="bm-header">
          <h3>📊 ALGORITHM ABILITY REPORT CARD</h3>
          <span class="bm-rounds-badge">${r.completedRounds} Rounds Evaluated</span>
        </div>

        <!-- Win Rate Split Bar -->
        <div class="bm-split-bar">
          <div class="bm-split-seg h1" style="width: ${r.winRate1}%">${r.winRate1}%</div>
          <div class="bm-split-seg h2" style="width: ${r.winRate2}%">${r.winRate2}%</div>
        </div>
        <div class="bm-split-labels">
          <span style="color:#a78bfa">${r.hero1Name}: ${r.winsHero1} Wins</span>
          <span style="color:#6b7280">${r.draws} Draws</span>
          <span style="color:#f87171">${r.hero2Name}: ${r.winsHero2} Wins</span>
        </div>

        <!-- Grade Badges Grid -->
        <div class="bm-grades-grid">
          <div class="bm-grade-box h1">
            <div class="grade-letter" style="color:${r.h1Grade.color}">${r.h1Grade.grade}</div>
            <div class="grade-title">${r.h1Grade.title}</div>
            <div class="grade-score">Ability Score: <strong>${r.h1Grade.score} / 100</strong></div>
          </div>
          <div class="bm-grade-box h2">
            <div class="grade-letter" style="color:${r.h2Grade.color}">${r.h2Grade.grade}</div>
            <div class="grade-title">${r.h2Grade.title}</div>
            <div class="grade-score">Ability Score: <strong>${r.h2Grade.score} / 100</strong></div>
          </div>
        </div>

        <!-- Comparative Metrics Table -->
        <table class="bm-table">
          <thead>
            <tr>
              <th>Evaluation Metric</th>
              <th style="color:#a78bfa">Hero 1 Performance</th>
              <th style="color:#f87171">Hero 2 Performance</th>
              <th>Advantage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Average DPS (Damage per Turn)</td>
              <td><strong>${r.h1Avg.dps}</strong> dmg</td>
              <td><strong>${r.h2Avg.dps}</strong> dmg</td>
              <td>${r.h1Avg.dps >= r.h2Avg.dps ? '<span class="adv-tag h1">+Hero 1</span>' : '<span class="adv-tag h2">+Hero 2</span>'}</td>
            </tr>
            <tr>
              <td>Damage Taken per Match</td>
              <td>${r.h1Avg.damageTakenPerRound} dmg</td>
              <td>${r.h2Avg.damageTakenPerRound} dmg</td>
              <td>${r.h1Avg.damageTakenPerRound <= r.h2Avg.damageTakenPerRound ? '<span class="adv-tag h1">+Hero 1</span>' : '<span class="adv-tag h2">+Hero 2</span>'}</td>
            </tr>
            <tr>
              <td>Pathfinding Search Nodes Visited</td>
              <td>${r.h1Avg.avgNodes} nodes</td>
              <td>${r.h2Avg.avgNodes} nodes</td>
              <td>${r.h1Avg.avgNodes <= r.h2Avg.avgNodes ? '<span class="adv-tag h1">+Hero 1 (Leaner)</span>' : '<span class="adv-tag h2">+Hero 2 (Leaner)</span>'}</td>
            </tr>
            <tr>
              <td>Traps Triggered per Round</td>
              <td>${r.h1Avg.avgTrapsHit} traps</td>
              <td>${r.h2Avg.avgTrapsHit} traps</td>
              <td>${r.h1Avg.avgTrapsHit <= r.h2Avg.avgTrapsHit ? '<span class="adv-tag h1">+Hero 1</span>' : '<span class="adv-tag h2">+Hero 2</span>'}</td>
            </tr>
            <tr>
              <td>Items Gathered per Round</td>
              <td>${r.h1Avg.avgItems} items</td>
              <td>${r.h2Avg.avgItems} items</td>
              <td>${r.h1Avg.avgItems >= r.h2Avg.avgItems ? '<span class="adv-tag h1">+Hero 1</span>' : '<span class="adv-tag h2">+Hero 2</span>'}</td>
            </tr>
            <tr>
              <td>Decision Compute Latency</td>
              <td>${r.h1Avg.avgComputeMs} ms</td>
              <td>${r.h2Avg.avgComputeMs} ms</td>
              <td>${r.h1Avg.avgComputeMs <= r.h2Avg.avgComputeMs ? '<span class="adv-tag h1">+Hero 1 (Faster)</span>' : '<span class="adv-tag h2">+Hero 2 (Faster)</span>'}</td>
            </tr>
          </tbody>
        </table>

        <!-- Strategic Summary Note -->
        <div class="bm-summary-note">
          <h4>💡 Tactical Diagnostic:</h4>
          <p>${this.generateDiagnosticText(r)}</p>
        </div>
      </div>
    `;
  }

  generateDiagnosticText(r) {
    if (r.winRate1 > r.winRate2) {
      return `<strong>${r.hero1Name}</strong> demonstrated superior tactical dominance with a ${r.winRate1}% win rate. Its ability score of ${r.h1Grade.score} highlights exceptional decision efficiency, out-damaging the opponent by ${Math.abs(r.h1Avg.dps - r.h2Avg.dps).toFixed(1)} DPS while maintaining tighter resource and health economy.`;
    } else if (r.winRate2 > r.winRate1) {
      return `<strong>${r.hero2Name}</strong> outperformed the challenger with a ${r.winRate2}% win rate. Its strategic decision matrix counter-acted incoming threats effectively, securing an ability score of ${r.h2Grade.score}.`;
    }
    return `Both algorithms performed with near identical combat parity (${r.winRate1}% vs ${r.winRate2}%), indicating balanced heuristics and search depth equilibrium.`;
  }

  showDeclaration(icon, title, subtitle, variant = 'victory', durationMs = 2600) {
    const el = document.getElementById('arenaDeclaration');
    const iconEl = document.getElementById('decIcon');
    const titleEl = document.getElementById('decTitle');
    const subEl = document.getElementById('decSubtitle');
    if (!el || !titleEl) return;

    if (iconEl) iconEl.textContent = icon || '🏆';
    titleEl.textContent = title || '';
    if (subEl) subEl.textContent = subtitle || '';

    el.className = `arena-declaration show ${variant}`;

    clearTimeout(this._decTimer);
    this._decTimer = setTimeout(() => {
      el.classList.remove('show');
    }, durationMs);
  }
}

// Global UI Controller singleton
const uiController = new UIController();
if (typeof window !== 'undefined') {
  window.uiController = uiController;
}
