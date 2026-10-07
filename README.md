# ⚔ Dungeon of Minds: Warrior vs Mage AI

A turn-based 10x10 dungeon strategy game and AI benchmark laboratory featuring walls, traps, health potions, and roaming FSM-controlled goblins.

---

## 🎮 Game Overview & Rules

- **Grid**: 10x10 dungeon with procedural rooms, walls, traps (-10 HP), and health potions (+20 HP).
- **Characters**:
  - **Warrior** (100 HP, 20 ATK):
    - *Slash*: Adjacent melee strike (20 dmg, 90% accuracy).
    - *Block*: Halves all incoming damage (takes 50% less damage) until next turn.
    - *AI*: **Minimax with Alpha-Beta Pruning** ($\alpha$-$\beta$).
  - **Mage** (70 HP, 10 ATK):
    - *Magic Missile*: Ranged projectile (range 3, 10 dmg, 100% accuracy).
    - *Fireball*: Heavy blast (range 4, 25 dmg, 80% accuracy, 2-turn cooldown).
    - *AI*: **Expectimax Search** (probabilistic chance nodes).
  - **Goblins** (20 HP, 5 ATK):
    - Roam the dungeon and attack whichever hero is closer.
    - Governed by **Finite State Machine (FSM)**: `Patrol → Chase → Attack → Flee`.
- **Turn Order**: Warrior → Mage → Goblins → Next Round.
- **Win Condition**: Reduce opponent to 0 HP. If neither wins within 40 rounds, the hero with higher remaining HP wins!

---

## 🚀 How to Run

### Option 1: Run with Docker (Recommended for Anyone)

Using Docker Compose:
```bash
docker compose up
```

Or build and run the Docker image directly:
```bash
docker build -t dungeon-of-minds .
docker run -d -p 8080:80 --name dungeon_app dungeon-of-minds
```
Then open your browser at: **[http://localhost:8080](http://localhost:8080)**

---

### Option 2: Run with Node.js

Start the built-in static server:
```bash
npm start
# or
node server.js
```
Then open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

### Option 3: Direct Browser File

Simply open `index.html` directly in any web browser:
```
c:/Users/user/Downloads/AI lab project/index.html
```

---

## 🧪 Testing

Run the automated test suite (39 unit & integration tests):
```bash
npm test
# or
node test_algorithms.js
```
