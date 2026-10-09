/**
 * AI Dungeon Duel — Ascension Edition
 * Procedural Dungeon Generation, Fog of War, and Spatial Utilities
 */

class DungeonManager {
  constructor(cols = COLS, rows = ROWS) {
    this.cols = cols;
    this.rows = rows;
  }

  generate(customSeed = null) {
    const grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
    const rooms = [];

    const carveRoom = (x, y, w, h) => {
      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          if (rx > 0 && rx < this.cols - 1 && ry > 0 && ry < this.rows - 1) {
            grid[ry][rx] = 0; // 0 = floor
          }
        }
      }
      rooms.push({
        x,
        y,
        w,
        h,
        cx: Math.floor(x + w / 2),
        cy: Math.floor(y + h / 2)
      });
    };

    const carveCorridor = (x1, y1, x2, y2) => {
      let cx = x1;
      let cy = y1;
      const coin = Math.random() < 0.5;

      // Always carve the start tile
      grid[cy][cx] = 0;

      if (coin) {
        // Horizontal first, then vertical
        while (cx !== x2) {
          cx += cx < x2 ? 1 : -1;
          if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) grid[cy][cx] = 0;
        }
        while (cy !== y2) {
          cy += cy < y2 ? 1 : -1;
          if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) grid[cy][cx] = 0;
        }
      } else {
        // Vertical first, then horizontal
        while (cy !== y2) {
          cy += cy < y2 ? 1 : -1;
          if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) grid[cy][cx] = 0;
        }
        while (cx !== x2) {
          cx += cx < x2 ? 1 : -1;
          if (cx >= 0 && cx < this.cols && cy >= 0 && cy < this.rows) grid[cy][cx] = 0;
        }
      }
      // Always carve the end tile too
      if (x2 >= 0 && x2 < this.cols && y2 >= 0 && y2 < this.rows) grid[y2][x2] = 0;
    };

    // Flood-fill reachability check — returns set of reachable keys from (sx, sy)
    const floodFill = (sx, sy) => {
      const reachable = new Set();
      const q = [[sx, sy]];
      reachable.add(`${sx},${sy}`);
      while (q.length > 0) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const nx = x + dx, ny = y + dy;
          const k = `${nx},${ny}`;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && grid[ny][nx] === 0 && !reachable.has(k)) {
            reachable.add(k);
            q.push([nx, ny]);
          }
        }
      }
      return reachable;
    };


    // Attempt random rooms
    const attempts = 45;
    for (let i = 0; i < attempts && rooms.length < 9; i++) {
      const w = 2 + Math.floor(Math.random() * 3);
      const h = 2 + Math.floor(Math.random() * 3);
      const x = 1 + Math.floor(Math.random() * (this.cols - w - 2));
      const y = 1 + Math.floor(Math.random() * (this.rows - h - 2));

      const overlaps = rooms.some(
        r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y
      );

      if (!overlaps) {
        carveRoom(x, y, w, h);
      }
    }

    // Fallback if random placement created too few rooms
    if (rooms.length < 4) {
      carveRoom(1, 1, 3, 3);
      carveRoom(this.cols - 4, 1, 3, 3);
      carveRoom(1, this.rows - 4, 3, 3);
      carveRoom(this.cols - 4, this.rows - 4, 3, 3);
      carveRoom(Math.floor(this.cols / 2) - 1, Math.floor(this.rows / 2) - 1, 3, 3);
    }

    // Connect all rooms with corridors (sequential chain guarantees full connectivity)
    for (let i = 0; i < rooms.length - 1; i++) {
      carveCorridor(rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
    }

    // Loop corridor for tactical navigation branches
    if (rooms.length >= 3) {
      carveCorridor(rooms[0].cx, rooms[0].cy, rooms[rooms.length - 1].cx, rooms[rooms.length - 1].cy);
    }

    // Verify all room centres are reachable from room 0 — carve direct corridors for any isolated rooms
    if (rooms.length > 1) {
      const reachable = floodFill(rooms[0].cx, rooms[0].cy);
      for (let i = 1; i < rooms.length; i++) {
        const rm = rooms[i];
        if (!reachable.has(`${rm.cx},${rm.cy}`)) {
          // Force a direct corridor from the closest already-reachable room
          let nearest = rooms[0];
          let bestD = Infinity;
          for (const r of rooms) {
            if (reachable.has(`${r.cx},${r.cy}`)) {
              const d = Math.abs(r.cx - rm.cx) + Math.abs(r.cy - rm.cy);
              if (d < bestD) { bestD = d; nearest = r; }
            }
          }
          carveCorridor(nearest.cx, nearest.cy, rm.cx, rm.cy);
          // Update flood-fill after reconnect
          const updated = floodFill(rooms[0].cx, rooms[0].cy);
          updated.forEach(k => reachable.add(k));
        }
      }
    }

    // Identify all floor tiles
    const floorTiles = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (grid[y][x] === 0) floorTiles.push({ x, y });
      }
    }

    // Spawn traps
    const traps = new Set();
    const trapCount = 3 + Math.floor(Math.random() * 4);
    const start1 = rooms[0];
    const start2 = rooms[rooms.length - 1];

    for (let i = 0; i < trapCount; i++) {
      const tile = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      if (tile) {
        // Avoid spawning directly on hero spawn points
        if (
          (tile.x === start1.cx && tile.y === start1.cy) ||
          (tile.x === start2.cx && tile.y === start2.cy)
        ) {
          continue;
        }
        traps.add(`${tile.x},${tile.y}`);
      }
    }

    // ── Spawn items ─────────────────────────────────────────────────────
    const items = [];
    const midRooms = rooms.slice(1, -1);
    const itemSequence = ['potion', 'mpot', 'power', 'chest', 'shrine'];

    // Place Grand Treasure in the room closest to the map centre
    const mapCX = Math.floor(this.cols / 2);
    const mapCY = Math.floor(this.rows / 2);

    const sorted = [...midRooms].sort(
      (a, b) =>
        (Math.abs(a.cx - mapCX) + Math.abs(a.cy - mapCY)) -
        (Math.abs(b.cx - mapCX) + Math.abs(b.cy - mapCY))
    );

    const treasureRoom = sorted[0] || rooms[Math.floor(rooms.length / 2)];
    const otherMidRooms = midRooms.filter(r => r !== treasureRoom);

    // The main objective
    items.push({
      id: 'treasure_main',
      x: treasureRoom.cx,
      y: treasureRoom.cy,
      type: 'treasure',
      collected: false,
      isMainTreasure: true
    });

    // Support items in remaining rooms (up to 5)
    otherMidRooms.forEach((rm, idx) => {
      if (idx >= 5) return;
      const type = itemSequence[idx % itemSequence.length];
      items.push({
        id: `item_${idx}`,
        x: rm.cx,
        y: rm.cy,
        type,
        collected: false,
        isMainTreasure: false
      });
    });

    // ── Spawn Goblins (spec: ~20 HP, 5 dmg, FSM Patrol/Chase/Attack/Flee) ───
    const goblins = [];
    const gobRooms = rooms.length > 2 ? rooms.slice(1, -1) : rooms;
    const numGobs = Math.min(3, Math.max(2, gobRooms.length));
    for (let i = 0; i < numGobs; i++) {
      const r1 = gobRooms[i % gobRooms.length];
      const r2 = gobRooms[(i + 1) % gobRooms.length];
      goblins.push({
        id: `goblin_${i + 1}`,
        name: `Goblin ${i + 1}`,
        x: r1.cx,
        y: r1.cy,
        maxHp: GOBLIN_HP,
        hp: GOBLIN_HP,
        atk: GOBLIN_ATK,
        alive: true,
        state: GOBLIN_STATES.PATROL,
        patrolPoints: [
          { x: r1.cx, y: r1.cy },
          { x: r2.cx, y: r2.cy }
        ],
        patrolIdx: 0,
        color: '#10b981',
        dark: '#064e3b',
        symbol: 'G'
      });
    }

    return {
      grid,
      rooms,
      traps,
      trapCosts: {},
      items,
      goblins,
      treasurePos: { x: treasureRoom.cx, y: treasureRoom.cy },
      cols: this.cols,
      rows: this.rows
    };
  }

  isFree(x, y, grid) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows && grid[y][x] === 0;
  }

  hasLineOfSight(x0, y0, x1, y1, grid) {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      if (cx === x1 && cy === y1) return true;
      if (!this.isFree(cx, cy, grid) && !(cx === x0 && cy === y0)) return false;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        cx += sx;
      }
      if (e2 <= dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  getVisibleTiles(heroX, heroY, grid, radius = 5) {
    const vis = new Set();
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const nx = heroX + dx;
        const ny = heroY + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          if (this.hasLineOfSight(heroX, heroY, nx, ny, grid)) {
            vis.add(`${nx},${ny}`);
          }
        }
      }
    }
    return vis;
  }
}

// Distance utilities
function manhattanDist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors4(x, y, cols, rows, grid) {
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
  ];
  const results = [];
  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && grid[ny][nx] === 0) {
      results.push({ x: nx, y: ny, dx, dy });
    }
  }
  return results;
}
