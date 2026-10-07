/**
 * AI Dungeon Duel — Ascension Edition
 * Pathfinding Algorithms Suite: A*, Dijkstra, Greedy BFS, BFS, DFS, and Custom Sandbox Runner
 */

class PathfindingEngine {
  constructor() {
    this.key = (x, y) => `${x},${y}`;
  }

  getNeighbors(x, y, grid, otherHero, cols = COLS, rows = ROWS) {
    const directions = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];
    const neighbors = [];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
        // Avoid stepping onto other hero tile unless it is the goal
        if (otherHero && nx === otherHero.x && ny === otherHero.y) {
          // Can target if attacking
        }
        neighbors.push({ x: nx, y: ny, dx, dy });
      }
    }
    return neighbors;
  }

  // 1. A* SEARCH (Astar)
  runAStar(sx, sy, gx, gy, grid, trapCosts = {}, otherHero = null) {
    const t0 = performance.now();
    if (sx === gx && sy === gy) return { path: [], nodesVisited: 0, timeTakenMs: 0, searchTree: [] };

    const open = [{ x: sx, y: sy, g: 0, f: Math.abs(sx - gx) + Math.abs(sy - gy), path: [] }];
    const closed = new Set();
    const searchTree = [];
    let nodesVisited = 0;

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      const k = this.key(cur.x, cur.y);

      if (cur.x === gx && cur.y === gy) {
        return {
          path: cur.path,
          nodesVisited,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree
        };
      }

      if (closed.has(k)) continue;
      closed.add(k);
      nodesVisited++;
      searchTree.push({ x: cur.x, y: cur.y });

      const neighbors = this.getNeighbors(cur.x, cur.y, grid, otherHero);
      for (const nb of neighbors) {
        const nk = this.key(nb.x, nb.y);
        if (closed.has(nk)) continue;
        if (otherHero && nb.x === otherHero.x && nb.y === otherHero.y && !(nb.x === gx && nb.y === gy)) {
          continue;
        }

        const hazardCost = trapCosts[nk] || 0;
        const g = cur.g + 1 + hazardCost;
        const h = Math.abs(nb.x - gx) + Math.abs(nb.y - gy);
        const f = g + h;

        open.push({
          x: nb.x,
          y: nb.y,
          g,
          f,
          path: [...cur.path, [nb.dx, nb.dy]]
        });
      }
    }

    return {
      path: null,
      nodesVisited,
      timeTakenMs: performance.now() - t0,
      searchTree
    };
  }

  // 2. DIJKSTRA'S ALGORITHM (Uniform Cost Search)
  runDijkstra(sx, sy, gx, gy, grid, trapCosts = {}, otherHero = null) {
    const t0 = performance.now();
    if (sx === gx && sy === gy) return { path: [], nodesVisited: 0, timeTakenMs: 0, searchTree: [] };

    const dist = new Map();
    const open = [{ x: sx, y: sy, cost: 0, path: [] }];
    const closed = new Set();
    const searchTree = [];
    let nodesVisited = 0;
    dist.set(this.key(sx, sy), 0);

    while (open.length > 0) {
      open.sort((a, b) => a.cost - b.cost);
      const cur = open.shift();
      const k = this.key(cur.x, cur.y);

      if (cur.x === gx && cur.y === gy) {
        return {
          path: cur.path,
          nodesVisited,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree
        };
      }

      if (closed.has(k)) continue;
      closed.add(k);
      nodesVisited++;
      searchTree.push({ x: cur.x, y: cur.y });

      const neighbors = this.getNeighbors(cur.x, cur.y, grid, otherHero);
      for (const nb of neighbors) {
        const nk = this.key(nb.x, nb.y);
        if (closed.has(nk)) continue;
        if (otherHero && nb.x === otherHero.x && nb.y === otherHero.y && !(nb.x === gx && nb.y === gy)) {
          continue;
        }

        const hazardCost = trapCosts[nk] || 0;
        const newCost = cur.cost + 1 + hazardCost;

        if (!dist.has(nk) || newCost < dist.get(nk)) {
          dist.set(nk, newCost);
          open.push({
            x: nb.x,
            y: nb.y,
            cost: newCost,
            path: [...cur.path, [nb.dx, nb.dy]]
          });
        }
      }
    }

    return {
      path: null,
      nodesVisited,
      timeTakenMs: performance.now() - t0,
      searchTree
    };
  }

  // 3. GREEDY BEST-FIRST SEARCH
  runGreedyBFS(sx, sy, gx, gy, grid, trapCosts = {}, otherHero = null) {
    const t0 = performance.now();
    if (sx === gx && sy === gy) return { path: [], nodesVisited: 0, timeTakenMs: 0, searchTree: [] };

    const open = [{ x: sx, y: sy, h: Math.abs(sx - gx) + Math.abs(sy - gy), path: [] }];
    const closed = new Set();
    const searchTree = [];
    let nodesVisited = 0;

    while (open.length > 0) {
      open.sort((a, b) => a.h - b.h);
      const cur = open.shift();
      const k = this.key(cur.x, cur.y);

      if (cur.x === gx && cur.y === gy) {
        return {
          path: cur.path,
          nodesVisited,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree
        };
      }

      if (closed.has(k)) continue;
      closed.add(k);
      nodesVisited++;
      searchTree.push({ x: cur.x, y: cur.y });

      const neighbors = this.getNeighbors(cur.x, cur.y, grid, otherHero);
      for (const nb of neighbors) {
        const nk = this.key(nb.x, nb.y);
        if (closed.has(nk)) continue;
        if (otherHero && nb.x === otherHero.x && nb.y === otherHero.y && !(nb.x === gx && nb.y === gy)) {
          continue;
        }

        const h = Math.abs(nb.x - gx) + Math.abs(nb.y - gy);
        open.push({
          x: nb.x,
          y: nb.y,
          h,
          path: [...cur.path, [nb.dx, nb.dy]]
        });
      }
    }

    return {
      path: null,
      nodesVisited,
      timeTakenMs: performance.now() - t0,
      searchTree
    };
  }

  // 4. BREADTH-FIRST SEARCH (BFS)
  runBFS(sx, sy, gx, gy, grid, otherHero = null) {
    const t0 = performance.now();
    if (sx === gx && sy === gy) return { path: [], nodesVisited: 0, timeTakenMs: 0, searchTree: [] };

    const queue = [{ x: sx, y: sy, path: [] }];
    const visited = new Set([this.key(sx, sy)]);
    const searchTree = [];
    let nodesVisited = 0;

    while (queue.length > 0) {
      const cur = queue.shift();
      nodesVisited++;
      searchTree.push({ x: cur.x, y: cur.y });

      if (cur.x === gx && cur.y === gy) {
        return {
          path: cur.path,
          nodesVisited,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree
        };
      }

      const neighbors = this.getNeighbors(cur.x, cur.y, grid, otherHero);
      for (const nb of neighbors) {
        const nk = this.key(nb.x, nb.y);
        if (visited.has(nk)) continue;
        if (otherHero && nb.x === otherHero.x && nb.y === otherHero.y && !(nb.x === gx && nb.y === gy)) {
          continue;
        }

        visited.add(nk);
        queue.push({
          x: nb.x,
          y: nb.y,
          path: [...cur.path, [nb.dx, nb.dy]]
        });
      }
    }

    return {
      path: null,
      nodesVisited,
      timeTakenMs: performance.now() - t0,
      searchTree
    };
  }

  // 5. DEPTH-FIRST SEARCH (DFS)
  runDFS(sx, sy, gx, gy, grid, otherHero = null, maxDepth = 150) {
    const t0 = performance.now();
    if (sx === gx && sy === gy) return { path: [], nodesVisited: 0, timeTakenMs: 0, searchTree: [] };

    const stack = [{ x: sx, y: sy, depth: 0, path: [] }];
    const visited = new Set();
    const searchTree = [];
    let nodesVisited = 0;

    while (stack.length > 0) {
      const cur = stack.pop();
      const k = this.key(cur.x, cur.y);

      if (cur.x === gx && cur.y === gy) {
        return {
          path: cur.path,
          nodesVisited,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree
        };
      }

      if (visited.has(k) || cur.depth > maxDepth) continue;
      visited.add(k);
      nodesVisited++;
      searchTree.push({ x: cur.x, y: cur.y });

      const neighbors = this.getNeighbors(cur.x, cur.y, grid, otherHero);
      // Randomize or reverse order to prevent predictable loops
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const nb = neighbors[i];
        const nk = this.key(nb.x, nb.y);
        if (visited.has(nk)) continue;
        if (otherHero && nb.x === otherHero.x && nb.y === otherHero.y && !(nb.x === gx && nb.y === gy)) {
          continue;
        }

        stack.push({
          x: nb.x,
          y: nb.y,
          depth: cur.depth + 1,
          path: [...cur.path, [nb.dx, nb.dy]]
        });
      }
    }

    return {
      path: null,
      nodesVisited,
      timeTakenMs: performance.now() - t0,
      searchTree
    };
  }

  // 6. CUSTOM USER PATHFINDING EXECUTION
  runCustom(customFn, sx, sy, gx, gy, grid, trapCosts = {}, otherHero = null) {
    const t0 = performance.now();
    try {
      const result = customFn({
        start: { x: sx, y: sy },
        goal: { x: gx, y: gy },
        grid,
        trapCosts,
        otherHero: otherHero ? { x: otherHero.x, y: otherHero.y } : null,
        cols: COLS,
        rows: ROWS,
        manhattan: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
        getNeighbors: (x, y) => this.getNeighbors(x, y, grid, otherHero)
      });

      if (result && Array.isArray(result.path)) {
        return {
          path: result.path,
          nodesVisited: result.nodesVisited || result.path.length,
          timeTakenMs: Math.max(0.01, performance.now() - t0),
          searchTree: result.searchTree || []
        };
      }
    } catch (err) {
      console.warn('Custom pathfinder error, falling back to A*:', err);
    }
    // Fallback safely to A*
    return this.runAStar(sx, sy, gx, gy, grid, trapCosts, otherHero);
  }

  // Unified Dispatcher
  findPath(algoId, sx, sy, gx, gy, grid, trapCosts = {}, otherHero = null, customFn = null) {
    switch (algoId) {
      case 'astar':
        return this.runAStar(sx, sy, gx, gy, grid, trapCosts, otherHero);
      case 'dijkstra':
        return this.runDijkstra(sx, sy, gx, gy, grid, trapCosts, otherHero);
      case 'greedy_bfs':
        return this.runGreedyBFS(sx, sy, gx, gy, grid, trapCosts, otherHero);
      case 'bfs':
        return this.runBFS(sx, sy, gx, gy, grid, otherHero);
      case 'dfs':
        return this.runDFS(sx, sy, gx, gy, grid, otherHero);
      case 'custom_path':
        if (customFn) {
          return this.runCustom(customFn, sx, sy, gx, gy, grid, trapCosts, otherHero);
        }
        return this.runAStar(sx, sy, gx, gy, grid, trapCosts, otherHero);
      default:
        return this.runAStar(sx, sy, gx, gy, grid, trapCosts, otherHero);
    }
  }
}

// Global pathfinding singleton
const pathfindingEngine = new PathfindingEngine();
