/**
 * AI Dungeon Duel — Ascension Edition
 * Game Constants & Configuration
 */

// Grid Dimensions
const CELL = 34;
const COLS = 13;
const ROWS = 11;

// ── Hero Role Definitions (Warrior vs Mage spec) ──────────────────────
const HERO_ROLES = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔',
    maxHp: 100,
    atk: 20,
    color: '#a78bfa',
    dark: '#4c1d95',
    symbol: 'W',
    combatAlgo: 'minimax_4',    // Minimax + Alpha-Beta Pruning (worst-case planning)
    abilities: ['slash', 'block', 'wait', 'heavy', 'heal', 'rage', 'ult']
  },
  mage: {
    name: 'Mage',
    emoji: '🔮',
    maxHp: 70,
    atk: 10,
    color: '#f87171',
    dark: '#7f1d1d',
    symbol: 'M',
    combatAlgo: 'expectimax',   // Expectimax (chance-aware planning)
    abilities: ['missile', 'fireball', 'wait', 'drain', 'shield', 'heal', 'ult']
  }
};

// ── Goblin FSM Constants ───────────────────────────────────────────────
const GOBLIN_HP         = 20;   // ~20 HP per spec
const GOBLIN_ATK        = 5;    // 5 dmg per spec
const GOBLIN_CHASE_RANGE = 4;   // tiles within which a goblin switches from Patrol → Chase
const GOBLIN_FLEE_HP    = 5;    // HP threshold below which goblin flees
const GOBLIN_SPEED      = 1;    // tiles per goblin turn

const GOBLIN_STATES = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', FLEE: 'flee' };

// ── Tile Damage & Healing (spec: trap=10 HP, potion=20 HP) ────────────
const TRAP_DAMAGE   = 10;   // spec: trap costs 10 HP
const POTION_HEAL   = 20;   // spec: potion restores 20 HP

// ── Combat Round Limit (spec: 40 rounds → HP winner) ─────────────────
const MAX_COMBAT_ROUNDS = 40;

// Hero Base Limits (legacy — used by generic hero system)
const MAX_HP = 30;
const MAX_MP = 10;
const MAX_ULT = 100;

// Game Speeds (ms delay per step)
const SPEED_MAP = {
  1: 700,
  2: 380,
  3: 200,
  4: 75,
  5: 15
};

const SPEED_NAMES = {
  1: 'Slow (700ms)',
  2: 'Moderate (380ms)',
  3: 'Normal (200ms)',
  4: 'Fast (75ms)',
  5: 'Turbo (15ms)'
};

// Combat Actions Definition
const ACTIONS = [
  'slash',
  'block',
  'missile',
  'fireball',
  'wait',
  'attack',
  'heavy',
  'magic',
  'drain',
  'stun',
  'poison',
  'rage',
  'shield',
  'heal',
  'ult'
];

const ACTION_INFO = {
  slash: {
    name: 'Slash',
    key: 'S',
    range: 1,
    dmg: 20,
    hitChance: 0.90,
    mpCost: 0,
    ultGain: 10,
    type: 'physical',
    desc: 'Adjacent melee strike (range 1). Deals 20 dmg (90% hit rate).',
    color: '#a78bfa'
  },
  block: {
    name: 'Block',
    key: 'B',
    range: 0,
    dmg: 0,
    mpCost: 0,
    ultGain: 5,
    type: 'defense',
    desc: 'Defensive stance: takes 50% less damage until next turn.',
    color: '#60a5fa'
  },
  missile: {
    name: 'Magic Missile',
    key: 'M',
    range: 3,
    dmg: 10,
    hitChance: 1.00,
    mpCost: 0,
    ultGain: 8,
    type: 'magic',
    desc: 'Guaranteed ranged projectile (range 3). Deals 10 dmg (100% hit rate).',
    color: '#c084fc'
  },
  fireball: {
    name: 'Fireball',
    key: 'F',
    range: 4,
    dmg: 25,
    hitChance: 0.80,
    cooldown: 2,
    mpCost: 0,
    ultGain: 15,
    type: 'magic',
    desc: 'Blazing fireball (range 4). Deals 25 dmg (80% hit rate, 2-turn cooldown).',
    color: '#f97316'
  },
  wait: {
    name: 'Wait / Pass',
    key: 'W',
    range: 0,
    dmg: 0,
    mpCost: 0,
    ultGain: 2,
    type: 'defense',
    desc: 'Pass turn to recover stamina.',
    color: '#9ca3af'
  },
  attack: {
    name: 'Attack',
    key: 'A',
    mpCost: 0,
    ultGain: 8,
    type: 'physical',
    desc: 'Basic physical strike. Generates 8 ULT.',
    color: '#f87171'
  },
  heavy: {
    name: 'Heavy Strike',
    key: 'H',
    mpCost: 3,
    ultGain: 12,
    type: 'physical',
    desc: 'High physical damage smash. Requires 3 MP.',
    color: '#fb923c'
  },
  magic: {
    name: 'Fire Magic',
    key: 'G',
    mpCost: 4,
    ultGain: 10,
    type: 'magic',
    desc: 'Blazing projectile inflicting Burn (2 dmg/turn for 3 turns).',
    color: '#f97316'
  },
  drain: {
    name: 'Life Drain',
    key: 'D',
    mpCost: 3,
    ultGain: 8,
    type: 'magic',
    desc: 'Drains enemy vitality, healing self for 50% of damage dealt.',
    color: '#a78bfa'
  },
  stun: {
    name: 'Stun Bolt',
    key: 'T',
    mpCost: 4,
    ultGain: 6,
    type: 'control',
    desc: 'Electrocutes enemy, forcing them to miss next 2 turns.',
    color: '#e879f9'
  },
  poison: {
    name: 'Poison Dart',
    key: 'P',
    mpCost: 3,
    ultGain: 5,
    type: 'debuff',
    desc: 'Venomous strike inflicting Poison (3 dmg/turn for 5 turns).',
    color: '#4ade80'
  },
  rage: {
    name: 'Battle Rage',
    key: 'R',
    mpCost: 2,
    ultGain: 5,
    type: 'buff',
    desc: 'Enters frenzied state: +35% damage bonus for 4 turns.',
    color: '#fca5a5'
  },
  shield: {
    name: 'Aegis Shield',
    key: 'E',
    mpCost: 0,
    ultGain: 3,
    type: 'defense',
    desc: 'Defensive stance: reduces incoming damage by 62% for 3 turns.',
    color: '#60a5fa'
  },
  heal: {
    name: 'Holy Heal',
    key: 'Q',
    mpCost: 2,
    ultGain: 4,
    type: 'healing',
    desc: 'Restores up to 14 HP. Requires 2 MP.',
    color: '#34d399'
  },
  ult: {
    name: "Dragon's Wrath",
    key: 'U',
    mpCost: 0,
    ultGain: 0,
    type: 'ultimate',
    desc: 'Devastating ultimate (requires 100 ULT). Pierces shields!',
    color: '#fde68a'
  }
};

const ACT_COST = {
  slash: 0,
  block: 0,
  missile: 0,
  fireball: 0,
  wait: 0,
  attack: 0,
  heavy: 3,
  magic: 4,
  drain: 3,
  stun: 4,
  poison: 3,
  rage: 2,
  shield: 0,
  heal: 2,
  ult: 0
};

const ACT_ULT = {
  slash: 10,
  block: 5,
  missile: 8,
  fireball: 15,
  wait: 2,
  attack: 8,
  heavy: 12,
  magic: 10,
  drain: 8,
  stun: 6,
  poison: 5,
  rage: 5,
  shield: 3,
  heal: 4,
  ult: 0
};

// Item Type Properties
const ITEM_TYPES = {
  potion:   { name: 'Health Potion',     color: '#22c55e', desc: '+20 HP' },
  mpot:     { name: 'Mana Potion',       color: '#3b82f6', desc: '+5 MP' },
  power:    { name: 'Power Gem',         color: '#f59e0b', desc: '+2 Permanent ATK' },
  chest:    { name: 'Treasure Chest',    color: '#eab308', desc: 'Random Stat Boost' },
  shrine:   { name: 'Mystic Shrine',     color: '#a78bfa', desc: '+40 ULT Charge' },
  treasure: { name: '★ GRAND TREASURE', color: '#fde68a', desc: '⚡ CLAIM TO WIN THE ROUND!' }
};

// Win Conditions
const WIN_BY_TREASURE = 'treasure'; // hero reached the grand treasure first
const WIN_BY_COMBAT   = 'combat';   // hero killed the opponent in battle

// Algorithm Metadata Catalog
const PATHFINDING_ALGORITHMS = [
  { id: 'astar', name: 'A* Search (Manhattan + Hazard Avoidance)', desc: 'Optimal path with heuristic & dynamic trap avoidance' },
  { id: 'dijkstra', name: "Dijkstra's Algorithm (Uniform Cost)", desc: 'Guarantees shortest path by exploring lowest cost nodes first' },
  { id: 'greedy_bfs', name: 'Greedy Best-First Search', desc: 'Fast heuristic-only search; can get trapped in local minima' },
  { id: 'bfs', name: 'Breadth-First Search (BFS)', desc: 'Exhaustive level-order search exploring all radial neighbors' },
  { id: 'dfs', name: 'Depth-First Search (DFS)', desc: 'Explores deeply along single branches; suboptimal wandering' },
  { id: 'custom_path', name: 'Custom Algorithm (User Sandbox)', desc: 'Runs user-defined custom JavaScript pathfinding logic' }
];

const COMBAT_ALGORITHMS = [
  { id: 'minimax_4', name: 'Minimax (Alpha-Beta, Depth 4)', desc: 'Standard deep game-tree search evaluating adversarial responses' },
  { id: 'minimax_2', name: 'Minimax (Alpha-Beta, Depth 2)', desc: 'Shallow 2-turn lookahead search; faster but less strategic' },
  { id: 'expectimax', name: 'Expectimax Search (Stochastic)', desc: 'Accounts for random critical strike & status effect variance' },
  { id: 'mcts', name: 'Monte Carlo Tree Search (Rollouts)', desc: 'Simulates random playout trajectories to evaluate actions' },
  { id: 'rule_berserk', name: 'Expert System: Berserker Aggro', desc: 'Prioritizes raw burst damage, Rage buffs, and Ultimates' },
  { id: 'rule_mage', name: 'Expert System: Control Mage', desc: 'Focuses on Stun locks, Poison debuffs, Shields, and Drain' },
  { id: 'rule_balanced', name: 'Expert System: Balanced Tactician', desc: 'Dynamically adapts based on remaining HP and threat levels' },
  { id: 'random', name: 'Random Choice Baseline', desc: 'Randomly picks any affordable action for benchmark control' },
  { id: 'custom_combat', name: 'Custom Algorithm (User Sandbox)', desc: 'Runs user-defined custom JavaScript combat decision logic' }
];
