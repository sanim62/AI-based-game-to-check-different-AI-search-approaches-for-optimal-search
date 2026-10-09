/**
 * AI Dungeon Duel — Ascension Edition
 * Main Application Bootstrap & Entrypoint
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Renderer
  const renderer = new DungeonRenderer('canvas', 'fogCanvas', 'overlayCanvas');
  gameEngine.setRenderer(renderer);

  // Initialize UI Controller
  uiController.init();

  // Mode Tabs (AI vs AI / Human vs AI)
  const modeTabs = document.querySelectorAll('.mode-tab');
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      gameEngine.setMode(mode);
      soundSystem.sfxClick();
    });
  });

  // Initialize Match State
  gameEngine.initMatch();

  // Start Canvas Render Loop
  renderer.startLoop(() => gameEngine.getState());

  // Initial welcome message
  gameEngine.log('⚔ Welcome to Dungeon of Minds: Warrior vs Mage AI!', 'system');
  gameEngine.log('Turn order: Warrior → Mage → Goblins. 40 rounds max.', 'system');
});
