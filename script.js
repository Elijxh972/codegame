const levels = [
  { level: 1, word: "lion", hints: ["Animal", "Voiture", "Française"] },
  { level: 2, word: "sixseven", hints: ["Même", "Skrilla and NBA", "¯\\_(ツ)_/¯"] },
  { level: 3, word: "captcha", hints: ["tu es qu'au niveau 3 petit bot", "Vérification", "Anti-bot"] },
  { level: 4, word: "", hints: ["English or Spanish ?"] }, // Freeze level
  { level: 5, word: "abcdefghijklmnopqrstuvwxyz", hints: ["Connais tu ton alphabet ?"] } // Red/Green Light
];

let currentLevelIndex = 0;
let currentGame = null;
let nextHintIndex = 0;
let score = 100;
let penalty = 20;
let timerInterval = null;
let timeRemaining = 30;
let baseTime = 30; 
let timePenalty = 0; 
let mouseMoveHandler = null;
let keyMoveHandler = null;
let lastMouse = null;
let freezeMoved = false;
let greenLight = true;
let redLightFail = false;

/* =================== TIMER =================== */
function startTimer(onTimeUp) {
  clearInterval(timerInterval);
  // Level 5 gets 60 seconds, others get baseTime
  const timerDuration = currentGame && currentGame.level === 5 ? 60 : Math.max(5, baseTime - timePenalty);
  timeRemaining = timerDuration;
  document.getElementById('timer').textContent = '⏱ ' + timeRemaining + 's';
  timerInterval = setInterval(() => {
    timeRemaining--;
    document.getElementById('timer').textContent = '⏱ ' + timeRemaining + 's';
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      // Level 4 (Freeze): timer expiry = success if no movement
      if (currentGame && currentGame.level === 4) {
        if (onTimeUp) onTimeUp();
      } else {
        // All other levels: timer expiry = restart at level 1
        currentLevelIndex = 0;
        disableMouseJitter();
        window.removeEventListener('mousemove', freezeMouseHandler);
        window.removeEventListener('keydown', freezeKeyHandler);
        startGame();
      }
    }
  }, 1000);
}

/* =================== JEU PRINCIPAL =================== */
function startGame() {
  if (currentLevelIndex >= levels.length) {
    document.getElementById('feedback').textContent = '🎉 Tous les niveaux terminés !';
    document.getElementById('validateBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('startBtn').textContent = 'Rejouer depuis le début';
    currentLevelIndex = 0;
    return;
  }

  currentGame = levels[currentLevelIndex];
  nextHintIndex = 1;
  score = 100;
  penalty = Math.max(5, Math.ceil(100 / ((currentGame.hints || []).length + 1)));

  document.getElementById('level').textContent = 'Niveau ' + currentGame.level + ' / 5';
  document.getElementById('clue').textContent = currentGame.hints[0] || '';
  document.getElementById('hints').textContent = '';
  document.getElementById('feedback').textContent = '';
  document.getElementById('guess').value = '';
  document.getElementById('score').textContent = 'Score: ' + score;

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('validateBtn').style.display = 'inline-block';
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('retryBtn').style.display = 'none';
  document.getElementById('guess').disabled = false;

  disableMouseJitter();

  // Réinitialiser toutes les variables spécifiques aux niveaux spéciaux
  freezeMoved = false;
  redLightFail = false;
  greenLight = true;

  if (currentGame.level === 4) startFreezeLevel();
  else if (currentGame.level === 5) startGreenRedLevel();
  else startTimer();
}

/* =================== NIVEAUX 1-3 =================== */
function makeGuess() {
  const input = document.getElementById('guess');
  const userGuess = (input.value || '').trim().toLowerCase();
  if (!userGuess && (currentGame.word || '') !== '') return;

  if (!currentGame) {
    document.getElementById('feedback').textContent = 'Cliquez sur Démarrer pour lancer la partie.';
    return;
  }

  if (userGuess === (currentGame.word || '').toLowerCase()) {
    levelSuccess();
    return;
  }

  score = Math.max(0, score - penalty);
  document.getElementById('score').textContent = 'Score: ' + score;

  const hints = currentGame.hints || [];
  if (nextHintIndex < hints.length) {
    document.getElementById('hints').textContent += 'Indice ' + nextHintIndex + ': ' + hints[nextHintIndex] + '\n';
    nextHintIndex++;
    document.getElementById('feedback').textContent = 'Incorrect — nouvel indice affiché.';
  } else {
    document.getElementById('feedback').textContent = 'Incorrect — plus d\'indices disponibles.';
  }

  if (score <= 0) {
    clearInterval(timerInterval);
    handleLevelFailure('Score tombé à 0. Le mot était : ' + currentGame.word);
  }

  input.value = '';
}

/* =================== SUCCESS & FAILURE =================== */
function levelSuccess(customMessage) {
  clearInterval(timerInterval);
  disableMouseJitter();
  const container = document.querySelector('.game-container');
  container.style.borderColor = '#00ff9f';
  document.getElementById('feedback').textContent = customMessage || ('✔️ Niveau ' + currentGame.level + ' réussi !');
  document.getElementById('score').textContent = 'Score: ' + Math.max(0, score);
  document.getElementById('validateBtn').style.display = 'none';
  document.getElementById('nextBtn').style.display = 'inline-block';
  document.getElementById('guess').disabled = true;
}



/* =================== NEXT & RETRY =================== */
function nextLevel() {
  currentLevelIndex++;
  startGame();
}

function retryLevel() {
  currentLevelIndex = 0;
  startGame();
}


function handleLevelFailure(message) {
  clearInterval(timerInterval);
  disableMouseJitter();

  // Supprimer les écouteurs niveau 4 si existants
  window.removeEventListener('mousemove', freezeMouseHandler);
  window.removeEventListener('keydown', freezeKeyHandler);

  const container = document.querySelector('.game-container');
  container.style.borderColor = '#ff4444';
  document.getElementById('feedback').textContent = message || 'Niveau échoué.';
  document.getElementById('validateBtn').style.display = 'inline-block';
  document.getElementById('retryBtn').style.display = 'inline-block';
  document.getElementById('guess').disabled = true;

  document.getElementById('retryBtn').onclick = () => {
    window.location.reload();
    timePenalty -= 20; // Augmenter le temps pour la prochaine tentative
  };
}


/* =================== LEVEL 4: FREEZE =================== */
let freezeMouseHandler = null;
let freezeKeyHandler = null;

function startFreezeLevel() {
  const container = document.querySelector('.game-container');
  freezeMoved = false;

  freezeMouseHandler = () => { freezeMoved = true; };
  freezeKeyHandler = () => { freezeMoved = true; };

  window.addEventListener('mousemove', freezeMouseHandler);
  window.addEventListener('keydown', freezeKeyHandler);

  startTimer(() => finishFreezeLevel());
  
  // Clicking Valider button immediately fails level 4
  document.getElementById('validateBtn').onclick = () => {
    window.removeEventListener('keydown', freezeKeyHandler);
    handleLevelFailure('❌ Niveau 4 échoué : vous avez cliqué sur Valider !');
  };
}

function finishFreezeLevel() {
  window.removeEventListener('mousemove', freezeMouseHandler);
  window.removeEventListener('keydown', freezeKeyHandler);

  if (!freezeMoved) levelSuccess('✔️ Niveau 4 réussi ! Vous êtes resté immobile.');
  else handleLevelFailure('❌ Niveau 4 échoué : vous avez bougé !');
}


/* =================== LEVEL 5: GREEN/RED LIGHT =================== */
function startGreenRedLevel() {
  const container = document.querySelector('.game-container');
  const input = document.getElementById('guess');
  redLightFail = false;
  greenLight = Math.random() < 0.5; // Random initial state (true = green, false = red)

  document.getElementById('clue').textContent = 'Connais tu ton alphabet ?';

  let cycleTimer = null;
  let warnTimer = null;
  const WARNING_MS = 1000; // warning 1000ms avant le basculement

  function playBeep(duration = 0.08, freq = 800) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.value = 0.0001;
      o.start();
      // fade in then out
      g.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      setTimeout(() => { o.stop(); ctx.close(); }, (duration + 0.05) * 1000);
    } catch (e) { /* silent fallback */ }
  }

  /* --------------------------- RED / GREEN LIGHT LOOP (with warning) --------------------------- */
  function scheduleNextToggle() {
    // clear previous timers
    if (warnTimer) { clearTimeout(warnTimer); warnTimer = null; }
    if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }

    // Random duration between 1s and 4s
    const duration = Math.floor(Math.random() * 3000) + 1000;

    // schedule warning shortly before toggle
    const warnTime = Math.max(100, duration - WARNING_MS);
    warnTimer = setTimeout(() => {
      container.classList.add('warning');         // CSS pulse / glow
      playBeep(0.06, 900);                       // court beep
      try { if (navigator.vibrate) navigator.vibrate(40); } catch(_) {}
    }, warnTime);

    // schedule the actual toggle
    cycleTimer = setTimeout(() => {
      container.classList.remove('warning');
      // toggle state
      greenLight = !greenLight;
      container.style.borderColor = greenLight ? '#00ff9f' : '#ff4444';
      container.style.backgroundColor = greenLight
        ? 'rgba(30,30,30,0.95)'
        : 'rgba(50,0,0,0.95)';

      // continue loop
      if (!redLightFail) scheduleNextToggle();
    }, duration);
  }

  // start cycle
  scheduleNextToggle();

  /* --------------------------- Détection des erreurs pendant RED LIGHT --------------------------- */
  function failIfRed() {
    if (!greenLight) {
      redLightFail = true;
      clearInterval(timerInterval);
      if (warnTimer) { clearTimeout(warnTimer); warnTimer = null; }
      if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
      window.removeEventListener('mousemove', failIfRed);
      window.removeEventListener('keydown', failIfRed);
      input.removeEventListener('input', failIfRed);

      // afficher message d'échec puis réinitialiser la page
      document.getElementById('feedback').textContent = '❌ Niveau 5 échoué : action pendant le rouge.';
      setTimeout(() => { window.location.reload(); }, 800);
    }
  }

  window.addEventListener('mousemove', failIfRed);
  window.addEventListener('keydown', failIfRed);
  input.addEventListener('input', failIfRed);

  /* --------------------------- Timer principal --------------------------- */
  startTimer(() => {
    // cleanup
    if (warnTimer) { clearTimeout(warnTimer); warnTimer = null; }
    if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
    window.removeEventListener('mousemove', failIfRed);
    window.removeEventListener('keydown', failIfRed);
    input.removeEventListener('input', failIfRed);

    if (!redLightFail && input.value.toLowerCase() === currentGame.word) {
      levelSuccess('✔️ Niveau 5 réussi !');
    } else {
      handleLevelFailure('❌ Niveau 5 échoué !');
    }
  });

  /* --------------------------- Bouton Valider --------------------------- */
  document.getElementById('validateBtn').onclick = () => {
    if (!greenLight) {
      // during red: show message then reload
      clearInterval(timerInterval);
      if (warnTimer) { clearTimeout(warnTimer); warnTimer = null; }
      if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
      window.removeEventListener('mousemove', failIfRed);
      window.removeEventListener('keydown', failIfRed);
      input.removeEventListener('input', failIfRed);

      document.getElementById('feedback').textContent = '❌ Niveau 5 échoué : vous avez cliqué pendant le rouge.';
      setTimeout(() => { window.location.reload(); }, 800);
      return;
    }

    // During green light, check if answer is correct
    if (input.value.toLowerCase() === currentGame.word) {
      levelSuccess('✔️ Niveau 5 réussi !');
    } else {
      document.getElementById('feedback').textContent = 'Alphabet incomplet.';
      window.location.reload();
    }
  };
}

/* =================== MOUSE JITTER =================== */
function setMouseSensitivity(level) {
  disableMouseJitter();
  if (level >= 3 && level < 4) enableMouseJitter(level);
}

function enableMouseJitter(multiplier) {
  const container = document.querySelector('.game-container');
  lastMouse = null;
  mouseMoveHandler = function(e) {
    try {
      if (!lastMouse) { lastMouse = { x: e.clientX, y: e.clientY }; return; }
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
      const tx = Math.max(Math.min(dx * multiplier * 2, 20), -20);
      const ty = Math.max(Math.min(dy * multiplier * 2, 20), -20);
      container.style.transform = `translate(${tx}px, ${ty}px)`;
      clearTimeout(container._jitterReset);
      container._jitterReset = setTimeout(() => { container.style.transform = ''; }, 80);
    } catch (err) {}
  };
  window.addEventListener('mousemove', mouseMoveHandler, { passive: true });
}

function disableMouseJitter() {
  if (mouseMoveHandler) { window.removeEventListener('mousemove', mouseMoveHandler); mouseMoveHandler = null; }
  const container = document.querySelector('.game-container');
  if (container) { container.style.transform = ''; if(container._jitterReset){clearTimeout(container._jitterReset); container._jitterReset=null;} }
}

/* =================== FONCTIONS GLOBALES =================== */
window.startGame = startGame;
window.makeGuess = makeGuess;
window.nextLevel = nextLevel;
window.retryLevel = retryLevel;
