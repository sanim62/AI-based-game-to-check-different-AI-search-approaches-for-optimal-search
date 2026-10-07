/**
 * AI Dungeon Duel — Ascension Edition
 * Visual Canvas Renderer: Dungeon Tiles, Fog of War, Particles, Path Overlays, and Visual Search Heatmaps
 */

class DungeonRenderer {
  constructor(canvasId = 'canvas', fogCanvasId = 'fogCanvas', overlayCanvasId = 'overlayCanvas') {
    this.canvas = document.getElementById(canvasId);
    this.fogCanvas = document.getElementById(fogCanvasId);
    this.overlayCanvas = document.getElementById(overlayCanvasId);

    // Auto-create overlay canvas if missing from DOM
    if (!this.overlayCanvas && this.canvas && this.canvas.parentElement) {
      let oc = document.getElementById(overlayCanvasId);
      if (!oc) {
        oc = document.createElement('canvas');
        oc.id = overlayCanvasId;
        this.canvas.parentElement.appendChild(oc);
      }
      this.overlayCanvas = oc;
    }

    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.fctx = this.fogCanvas ? this.fogCanvas.getContext('2d') : null;
    this.octx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;

    this.cell = CELL;
    this.cols = COLS;
    this.rows = ROWS;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);

    this.initCanvasResolution();

    this.particles = [];
    this.floatingTexts = [];
    this.camShake = 0;
    this.showSearchFootprint = true;
    this.animFrameId = null;
  }

  initCanvasResolution() {
    const width = this.cols * this.cell;
    const height = this.rows * this.cell;
    const dpr = this.dpr;

    [
      { c: this.canvas, ctx: this.ctx },
      { c: this.fogCanvas, ctx: this.fctx },
      { c: this.overlayCanvas, ctx: this.octx }
    ].forEach(({ c, ctx }) => {
      if (!c || !ctx) return;
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    });
  }

  shake(amount = 4) {
    this.camShake = Math.max(this.camShake, amount);
  }

  spawnParticles(x, y, color = '#f59e0b', count = 10, speedMult = 1) {
    const px = x * this.cell + this.cell / 2;
    const py = y * this.cell + this.cell / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1 + Math.random() * 2.5) * speedMult;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.8 + Math.random() * 2.5,
        color,
        life: 25,
        maxLife: 25
      });
    }
  }

  spawnFloatingText(x, y, text, color = '#fde68a') {
    const px = x * this.cell + this.cell / 2;
    let py = y * this.cell + 2;

    // Stagger overlapping texts to prevent messy clusters when multiple events occur
    const nearby = this.floatingTexts.filter(t => Math.abs(t.x - px) < 16 && t.life > t.maxLife * 0.35);
    if (nearby.length > 0) {
      py -= nearby.length * 14;
    }

    this.floatingTexts.push({
      x: px,
      y: py,
      text: String(text),
      color,
      life: 50,
      maxLife: 50
    });
  }

  updateFog(heroes) {
    if (!this.fctx || !this.fogCanvas) return;
    const w = this.cols * this.cell;
    const h = this.rows * this.cell;

    this.fctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fctx.clearRect(0, 0, w, h);
    // Baseline dark shroud
    this.fctx.fillStyle = 'rgba(7, 5, 13, 0.94)';
    this.fctx.fillRect(0, 0, w, h);

    // Punch out visible areas
    this.fctx.globalCompositeOperation = 'destination-out';
    heroes.forEach(hero => {
      hero.vis.forEach(tileKey => {
        const [tx, ty] = tileKey.split(',').map(Number);
        this.fctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.fctx.fillRect(tx * this.cell, ty * this.cell, this.cell, this.cell);
      });
    });

    // Dim previously explored but currently out of sight tiles
    this.fctx.globalCompositeOperation = 'source-over';
    heroes.forEach(hero => {
      hero.explored.forEach(tileKey => {
        if (!hero.vis.has(tileKey)) {
          const [tx, ty] = tileKey.split(',').map(Number);
          this.fctx.fillStyle = 'rgba(7, 5, 13, 0.68)';
          this.fctx.fillRect(tx * this.cell, ty * this.cell, this.cell, this.cell);
        }
      });
    });
    this.fctx.globalCompositeOperation = 'source-over';
  }

  render(state) {
    if (!this.ctx) return;
    const { dungeon, heroes, items, goblins, phase } = state;
    const w = this.cols * this.cell;
    const h = this.rows * this.cell;

    // 0. Always reset matrix & clear top overlay canvas every frame
    // This completely eliminates fuzzy smearing and leftover ghost text trails
    if (this.octx) {
      this.octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.octx.clearRect(0, 0, w, h);
    }

    // Reset matrix & clear base canvas
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#09060f';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();

    // Camera shake
    if (this.camShake > 0) {
      const offsetX = (Math.random() - 0.5) * this.camShake;
      const offsetY = (Math.random() - 0.5) * this.camShake;
      this.ctx.translate(offsetX, offsetY);
      this.camShake = Math.max(0, this.camShake - 0.5);
    }

    // 1. Draw Dungeon Tiles
    this.drawTiles(dungeon, heroes);

    // 2. Draw Algorithm Search Footprint (if active)
    if (this.showSearchFootprint && phase === 'explore') {
      this.drawSearchFootprint(heroes);
    }

    // 3. Draw Path Overlay lines
    if (phase === 'explore') {
      this.drawPaths(heroes);
    }

    // 4. Draw Items (pass heroes so treasure can draw direction arrows)
    this.drawItems(items, heroes);

    // 5. Draw Goblins roaming the dungeon
    if (goblins && goblins.length) {
      this.drawGoblins(goblins);
    }

    // 6. Draw Heroes
    heroes.forEach((hero, idx) => {
      this.drawHero(hero, idx);
    });

    // 7. Draw Particles
    this.drawParticles();

    this.ctx.restore();

    // 8. Draw Floating Numbers & Action Declarations on Top Overlay Canvas
    this.drawFloatingTexts();
  }

  drawTiles(dungeon, heroes) {
    const grid = dungeon.grid;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const isWall = grid[y][x] === 1;
        const px = x * this.cell;
        const py = y * this.cell;

        if (isWall) {
          this.ctx.fillStyle = '#16101f';
          this.ctx.fillRect(px, py, this.cell, this.cell);
          // Wall bevel
          this.ctx.fillStyle = '#221930';
          this.ctx.fillRect(px + 2, py + 2, this.cell - 4, 3);
          this.ctx.fillStyle = '#0f0b15';
          this.ctx.fillRect(px + 2, py + this.cell - 4, this.cell - 4, 2);
        } else {
          // Stone floor tile
          this.ctx.fillStyle = '#1d1726';
          this.ctx.fillRect(px, py, this.cell, this.cell);
          this.ctx.fillStyle = '#251e30';
          this.ctx.fillRect(px + 1, py + 1, this.cell - 2, this.cell - 2);

          // Subtle floor texture pip
          this.ctx.fillStyle = '#2d253b';
          this.ctx.fillRect(px + this.cell / 2 - 1, py + this.cell / 2 - 1, 2, 2);

          // Trap indicators if known by any hero
          const isTrap = dungeon.traps.has(`${x},${y}`);
          const isKnown = isTrap && heroes.some(h => h.explored.has(`${x},${y}`));

          if (isKnown) {
            this.ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            this.ctx.fillRect(px + 2, py + 2, this.cell - 4, this.cell - 4);
            this.ctx.fillStyle = '#f87171';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⚠', px + this.cell / 2, py + this.cell / 2);
          }
        }
      }
    }
  }

  drawSearchFootprint(heroes) {
    heroes.forEach((h, idx) => {
      if (!h.lastSearchTree || !h.lastSearchTree.length) return;
      const color = idx === 0 ? 'rgba(139, 92, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)';
      this.ctx.fillStyle = color;
      h.lastSearchTree.forEach(pt => {
        this.ctx.fillRect(pt.x * this.cell + 2, pt.y * this.cell + 2, this.cell - 4, this.cell - 4);
      });
    });
  }

  drawPaths(heroes) {
    heroes.forEach((h, idx) => {
      if (!h.path || !h.path.length) return;
      this.ctx.strokeStyle = idx === 0 ? 'rgba(167, 139, 250, 0.65)' : 'rgba(248, 113, 113, 0.65)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);

      this.ctx.beginPath();
      this.ctx.moveTo(h.x * this.cell + this.cell / 2, h.y * this.cell + this.cell / 2);
      let cx = h.x;
      let cy = h.y;
      for (const [dx, dy] of h.path) {
        cx += dx;
        cy += dy;
        this.ctx.lineTo(cx * this.cell + this.cell / 2, cy * this.cell + this.cell / 2);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });
  }

  drawItems(items, heroes) {
    if (!items) return;
    const now  = Date.now();
    const time = now / 420;
    const pulse = (Math.sin(now / 260) + 1) / 2; // 0..1 oscillation

    for (const it of items) {
      if (it.collected) continue;

      // ── Grand Treasure — special render ───────────────────────────────
      if (it.type === 'treasure') {
        const px = it.x * this.cell + this.cell / 2;
        const py = it.y * this.cell + this.cell / 2;

        // Glowing floor highlight
        this.ctx.save();
        const glowR = 18 + pulse * 6;
        const grad = this.ctx.createRadialGradient(px, py, 4, px, py, glowR);
        grad.addColorStop(0, `rgba(253, 230, 138, ${0.55 + pulse * 0.35})`);
        grad.addColorStop(1, 'rgba(253, 230, 138, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(it.x * this.cell, it.y * this.cell, this.cell, this.cell);
        this.ctx.restore();

        // Spinning star crown
        const spin = (now / 900) % (Math.PI * 2);
        const bob  = Math.sin(now / 340) * 3;
        this.ctx.save();
        this.ctx.translate(px, py + bob);
        this.ctx.rotate(spin);
        this.ctx.shadowBlur = 24 + pulse * 14;
        this.ctx.shadowColor = '#fde68a';
        this.ctx.fillStyle = '#fde68a';
        // 6-point star
        this.ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const r    = i % 2 === 0 ? 12 : 5.5;
          const angle = (i * Math.PI) / 6;
          i === 0
            ? this.ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle))
            : this.ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // "★ TREASURE" label above
        this.ctx.save();
        this.ctx.font = `bold 9px Outfit, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillStyle = `rgba(253,230,138,${0.7 + pulse * 0.3})`;
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = '#fde68a';
        this.ctx.fillText('★ TREASURE', px, it.y * this.cell + bob - 2);
        this.ctx.restore();

        // Direction arrows for each hero pointing toward treasure
        if (heroes) {
          heroes.forEach((h, idx) => {
            if (!h.alive) return;
            const dx = it.x - h.x;
            const dy = it.y - h.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const arrowLen = 10;
            const nx = (dx / dist) * arrowLen;
            const ny = (dy / dist) * arrowLen;
            const ox = h.x * this.cell + this.cell / 2;
            const oy = h.y * this.cell + this.cell / 2;
            const arrowCol = idx === 0 ? 'rgba(167,139,250,0.6)' : 'rgba(248,113,113,0.6)';

            this.ctx.save();
            this.ctx.strokeStyle = arrowCol;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(ox, oy);
            this.ctx.lineTo(ox + nx, oy + ny);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.restore();
          });
        }
        continue;
      }

      // ── Regular items ─────────────────────────────────────────────────
      const bob   = Math.sin(time + it.x) * 2.5;
      const px    = it.x * this.cell + this.cell / 2;
      const py    = it.y * this.cell + this.cell / 2 + bob;
      const color = ITEM_TYPES[it.type] ? ITEM_TYPES[it.type].color : '#f59e0b';

      this.ctx.save();
      this.ctx.translate(px, py);
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = color;
      this.ctx.fillStyle = color;

      if (it.type === 'power' || it.type === 'chest') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -8);
        this.ctx.lineTo(7, 0);
        this.ctx.lineTo(0, 8);
        this.ctx.lineTo(-7, 0);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (it.type === 'shrine') {
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏛', 0, 0);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.beginPath();
        this.ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  drawHero(hero, idx) {
    const px = hero.x * this.cell;
    const py = hero.y * this.cell;
    const cx = px + this.cell / 2;
    const cy = py + this.cell / 2;

    if (!hero.alive) {
      this.ctx.globalAlpha = 0.4;
      this.ctx.fillStyle = hero.color;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      return;
    }

    // Rage Aura
    if (hero.raging) {
      this.ctx.save();
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = '#ef4444';
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeRect(px + 1, py + 1, this.cell - 2, this.cell - 2);
      this.ctx.restore();
    }

    // Shield Dome
    if (hero.shield) {
      this.ctx.save();
      this.ctx.strokeStyle = '#60a5fa';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#3b82f6';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.cell / 2 + 1, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Warrior Block Stance Dome (spec: takes 50% less damage)
    if (hero.blocked) {
      this.ctx.save();
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 2.8;
      this.ctx.shadowBlur = 16;
      this.ctx.shadowColor = '#0284c7';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.cell / 2 + 2, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      this.ctx.fill();
      this.ctx.restore();
    }

    // Hero Base Body
    this.ctx.save();
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = hero.color;
    this.ctx.fillStyle = hero.dark;
    this.ctx.fillRect(px + 3, py + 3, this.cell - 6, this.cell - 6);
    this.ctx.fillStyle = hero.color;
    this.ctx.fillRect(px + 5, py + 5, this.cell - 10, this.cell - 10);
    this.ctx.restore();

    // Ult Progress Ring
    if (hero.ult > 0) {
      const pct = hero.ult / MAX_ULT;
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2.2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.cell / 2 - 1, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      this.ctx.stroke();
    }

    // Hero Label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(hero.symbol, cx, cy);

    // Mini Health Bar on Map (scaled to hero.maxHp)
    const barW = this.cell - 6;
    const barH = 3;
    this.ctx.fillStyle = '#160e1d';
    this.ctx.fillRect(px + 3, py + this.cell - 5, barW, barH);
    const maxHp = hero.maxHp || MAX_HP;
    const hpPct = Math.max(0, hero.hp / maxHp);
    this.ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    this.ctx.fillRect(px + 3, py + this.cell - 5, Math.round(barW * hpPct), barH);
  }

  drawGoblins(goblins) {
    if (!goblins) return;
    goblins.forEach(gob => {
      if (!gob.alive) return;
      const px = gob.x * this.cell;
      const py = gob.y * this.cell;
      const cx = px + this.cell / 2;
      const cy = py + this.cell / 2;

      this.ctx.save();
      // Goblin Body
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#10b981';
      this.ctx.fillStyle = '#064e3b';
      this.ctx.fillRect(px + 4, py + 4, this.cell - 8, this.cell - 8);
      this.ctx.fillStyle = '#10b981';
      this.ctx.fillRect(px + 6, py + 6, this.cell - 12, this.cell - 12);
      this.ctx.restore();

      // Goblin Face
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('👺', cx, cy - 1);

      // Mini Health Bar on Map
      const barW = this.cell - 6;
      const barH = 3;
      this.ctx.fillStyle = '#160e1d';
      this.ctx.fillRect(px + 3, py + this.cell - 5, barW, barH);
      const hpPct = Math.max(0, gob.hp / GOBLIN_HP);
      this.ctx.fillStyle = hpPct > 0.4 ? '#10b981' : '#ef4444';
      this.ctx.fillRect(px + 3, py + this.cell - 5, Math.round(barW * hpPct), barH);

      // FSM State Tag pill (P=Patrol, C=Chase, A=Attack, F=Flee)
      const stateLetters = { patrol: 'P', chase: 'C', attack: 'A', flee: 'F' };
      const stateColors = { patrol: '#eab308', chase: '#f97316', attack: '#ef4444', flee: '#a855f7' };
      const sLet = stateLetters[gob.state] || 'P';
      const sCol = stateColors[gob.state] || '#eab308';

      this.ctx.fillStyle = sCol;
      this.ctx.beginPath();
      this.ctx.arc(px + this.cell - 5, py + 5, 4.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 6.5px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(sLet, px + this.cell - 5, py + 5);
    });
  }

  drawParticles() {
    this.particles = this.particles.filter(p => {
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });
    this.ctx.globalAlpha = 1;
  }

  drawFloatingTexts() {
    const targetCtx = this.octx || this.ctx;
    if (!targetCtx) return;

    this.floatingTexts = this.floatingTexts.filter(item => {
      targetCtx.save();
      const progress = 1 - (item.life / item.maxLife); // 0 to 1

      // Keep text solid & crystal clear for the first 72% of duration, then fade out cleanly
      let alpha = 1;
      if (progress > 0.72) {
        alpha = Math.max(0, (1 - progress) / 0.28);
      }
      targetCtx.globalAlpha = alpha;

      // Smooth float up with ease-out curve (no fractional pixel blur)
      const floatDist = Math.sin(progress * Math.PI * 0.5) * 30;
      const currentY = item.y - floatDist;

      // Pop-in scale: initial 1.25x scale that snaps to 1.0x in first 18% of animation
      const scale = progress < 0.18
        ? 1.25 - (progress / 0.18) * 0.25
        : 1.0;

      targetCtx.translate(item.x, currentY);
      if (scale !== 1.0) {
        targetCtx.scale(scale, scale);
      }

      targetCtx.font = '800 13px "Outfit", "Segoe UI", sans-serif';
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';

      // Crisp contrast dark outer stroke (eliminates all fuzzy edges against any background)
      targetCtx.strokeStyle = 'rgba(5, 3, 12, 0.96)';
      targetCtx.lineWidth = 3.6;
      targetCtx.lineJoin = 'round';
      targetCtx.miterLimit = 2;
      targetCtx.strokeText(item.text, 0, 0);

      // Vibrant, sharp fill
      targetCtx.fillStyle = item.color;
      targetCtx.fillText(item.text, 0, 0);

      targetCtx.restore();
      item.life--;
      return item.life > 0;
    });
  }

  startLoop(getStateFn) {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const loop = () => {
      const state = getStateFn();
      if (state) {
        this.render(state);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}
